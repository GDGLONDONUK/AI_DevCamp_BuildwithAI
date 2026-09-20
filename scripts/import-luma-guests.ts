/**
 * Import Luma guest CSV into Firestore for the active cohort.
 *
 *   npx tsx --env-file=.env.local scripts/import-luma-guests.ts
 *   npx tsx --env-file=.env.local scripts/import-luma-guests.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/import-luma-guests.ts --approved-only
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FieldValue, type QueryDocumentSnapshot, type WriteBatch } from "firebase-admin/firestore";
import {
  parseCSVText,
  isTicketEventExportFormat,
  buildTicketUsersFromRows,
  buildPreRegisteredUsersFromRows,
} from "../src/lib/admin/csvPreRegistered";
import { adminDb } from "../src/lib/firebase-admin";
import { getActiveCohortId } from "../src/lib/cohorts";
import { isLinkedProfile } from "../src/lib/server/resolveUserDocForImport";

const DEFAULT_CSV = resolve(
  process.cwd(),
  "scripts/imports/luma-sept-2026-guests.csv"
);

type BuiltUser = {
  email: string;
  displayName?: string;
  importSource?: string;
  joiningInPerson?: string;
  registeredAt?: string;
  formSubmittedAt?: string;
  [key: string]: unknown;
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function gmailAliases(email: string): string[] {
  const out = [email];
  if (email.endsWith("@gmail.com")) {
    out.push(email.replace(/@gmail\.com$/, "@googlemail.com"));
  } else if (email.endsWith("@googlemail.com")) {
    out.push(email.replace(/@googlemail\.com$/, "@gmail.com"));
  }
  return out;
}

async function loadUserIndex() {
  const db = adminDb();
  console.log("Loading users collection…");
  const snap = await db.collection("users").get();
  const byEmail = new Map<string, QueryDocumentSnapshot>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const emails = new Set<string>();
    if (doc.id.includes("@")) emails.add(normalizeEmail(doc.id));
    if (typeof data.email === "string" && data.email.includes("@")) {
      emails.add(normalizeEmail(data.email));
    }
    for (const e of emails) {
      // Prefer linked uid docs over pending email docs when both exist.
      const prev = byEmail.get(e);
      if (!prev) {
        byEmail.set(e, doc);
        continue;
      }
      const prevLinked = isLinkedProfile(prev.data() as Record<string, unknown>, prev.id);
      const nextLinked = isLinkedProfile(data as Record<string, unknown>, doc.id);
      if (nextLinked && !prevLinked) byEmail.set(e, doc);
    }
  }

  console.log(`Indexed ${byEmail.size} emails from ${snap.size} user docs`);
  return byEmail;
}

function findDoc(
  byEmail: Map<string, QueryDocumentSnapshot>,
  email: string
): QueryDocumentSnapshot | null {
  for (const alias of gmailAliases(email)) {
    const hit = byEmail.get(alias);
    if (hit) return hit;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const dryRun = args.includes("--dry-run");
  const approvedOnly = args.includes("--approved-only");
  const csvArg = args.find((a) => !a.startsWith("--"));
  const csvPath = resolve(csvArg || DEFAULT_CSV);

  const text = readFileSync(csvPath, "utf8");
  const rows = parseCSVText(text);
  const ticket = isTicketEventExportFormat(rows);
  let built = (
    ticket ? buildTicketUsersFromRows(rows) : buildPreRegisteredUsersFromRows(rows)
  ) as { unique: BuiltUser[]; duplicateCount: number };

  const header = rows[0] ?? [];
  const statusIdx = header.findIndex(
    (h) => h.trim().toLowerCase() === "approval_status"
  );
  const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
  const statuses: Record<string, number> = {};
  const statusByEmail = new Map<string, string>();
  for (let i = 1; i < rows.length; i++) {
    const s = (rows[i][statusIdx] || "unknown").toLowerCase();
    statuses[s] = (statuses[s] || 0) + 1;
    const em = normalizeEmail(rows[i][emailIdx] || "");
    if (em) statusByEmail.set(em, s);
  }

  if (approvedOnly) {
    built = {
      ...built,
      unique: built.unique.filter(
        (u) => (statusByEmail.get(normalizeEmail(u.email)) || "") === "approved"
      ),
    };
  }

  console.log(
    JSON.stringify(
      {
        csvPath,
        ticketFormat: ticket,
        rawRows: Math.max(0, rows.length - 1),
        uniqueEmails: built.unique.length,
        duplicateCount: built.duplicateCount,
        approvalStatuses: statuses,
        approvedOnly,
        activeCohortId: getActiveCohortId(),
        dryRun,
      },
      null,
      2
    )
  );

  if (built.unique.length === 0) {
    console.error("No importable rows.");
    process.exit(1);
  }

  const byEmail = await loadUserIndex();
  const cohortId = getActiveCohortId();
  const report = {
    linkedExisting: [] as string[],
    pendingEmailDoc: [] as string[],
    brandNew: [] as string[],
  };

  for (const u of built.unique) {
    const email = normalizeEmail(u.email);
    const doc = findDoc(byEmail, email);
    if (!doc) {
      report.brandNew.push(email);
    } else if (isLinkedProfile(doc.data() as Record<string, unknown>, doc.id)) {
      report.linkedExisting.push(email);
    } else {
      report.pendingEmailDoc.push(email);
    }
  }

  console.log(
    JSON.stringify(
      {
        match: {
          linkedExisting: report.linkedExisting.length,
          pendingEmailDoc: report.pendingEmailDoc.length,
          brandNew: report.brandNew.length,
        },
        linkedExistingSample: report.linkedExisting.slice(0, 20),
        brandNewSample: report.brandNew.slice(0, 20),
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log("Dry run only — no writes.");
    return;
  }

  const db = adminDb();
  const BATCH = 400;
  type Op = (batch: WriteBatch) => void;
  const writeOps: Op[] = [];
  let upserted = 0;

  for (const u of built.unique) {
    const email = normalizeEmail(u.email);
    const existing = findDoc(byEmail, email);
    const at =
      (typeof u.registeredAt === "string" && u.registeredAt) ||
      (typeof u.formSubmittedAt === "string" && u.formSubmittedAt) ||
      new Date().toISOString();

    if (!existing) {
      const ref = db.collection("users").doc(email);
      writeOps.push((batch) =>
        batch.set(
          ref,
          stripUndefined({
            ...u,
            email,
            uid: "",
            signedIn: false,
            registered: false,
            preRegistered: true,
            cohortIds: [cohortId],
            activeCohortId: cohortId,
            cohortParticipation: {
              [cohortId]: {
                status: "participated",
                joinedAt: at,
                role: "attendee",
              },
            },
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true }
        )
      );
    } else if (isLinkedProfile(existing.data() as Record<string, unknown>, existing.id)) {
      const data = existing.data() || {};
      const prevParticipation =
        typeof data.cohortParticipation === "object" && data.cohortParticipation
          ? data.cohortParticipation
          : {};
      writeOps.push((batch) =>
        batch.set(
          existing.ref,
          stripUndefined({
            email,
            preRegistered: true,
            importSource: u.importSource || "luma",
            joiningInPerson: u.joiningInPerson,
            kickoffInPersonRsvp: true,
            kickoffRsvpExplicitInApp: false,
            cohortIds: FieldValue.arrayUnion(cohortId),
            activeCohortId: cohortId,
            cohortParticipation: {
              ...prevParticipation,
              [cohortId]: {
                status: "participated",
                joinedAt: at,
                role: "attendee",
              },
            },
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true }
        )
      );
    } else {
      writeOps.push((batch) =>
        batch.set(
          existing.ref,
          stripUndefined({
            ...u,
            email,
            uid: "",
            signedIn: false,
            registered: false,
            preRegistered: true,
            cohortIds: [cohortId],
            activeCohortId: cohortId,
            cohortParticipation: {
              [cohortId]: {
                status: "participated",
                joinedAt: at,
                role: "attendee",
              },
            },
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true }
        )
      );
    }
  }

  for (let i = 0; i < writeOps.length; i += BATCH) {
    const batch = db.batch();
    const slice = writeOps.slice(i, i + BATCH);
    for (const op of slice) op(batch);
    await batch.commit();
    upserted += slice.length;
    console.log(`Committed ${upserted}/${writeOps.length}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        upserted,
        cohortId,
        linkedExisting: report.linkedExisting.length,
        pendingEmailDoc: report.pendingEmailDoc.length,
        brandNew: report.brandNew.length,
        note: "Existing accounts enrolled in September. New emails pending until register/sign-in.",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
