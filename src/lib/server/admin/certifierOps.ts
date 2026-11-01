/**
 * Admin Certifier sync / issue. Call only after requireAdmin (HTTP or MCP).
 */

import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { AdminOpError } from "@/lib/server/admin/errors";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";
import {
  certifierCredentialViewUrl,
  certifierGroupId,
  certifierGroupIdForCohort,
  createIssueSendCredential,
  pickBestCertifierCredential,
  searchCertifierCredentialsByEmail,
  type CertifierCredentialSummary,
} from "@/lib/server/certifier";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";
import { certifierGroupForKind } from "@/lib/certifierGroups";

export type CertifierSyncOpts = {
  uids?: string[];
  email?: string;
  certifiedOnly?: boolean;
};

export type CertifierSyncResult = {
  total: number;
  synced: number;
  missing: number;
  failed: number;
  syncedRows: { uid: string; email: string; credentialId: string }[];
  missingRows: { uid: string; email: string }[];
  failedRows: { uid: string; email: string; error: string }[];
};

async function loadSyncTargets(opts: CertifierSyncOpts): Promise<DocumentSnapshot[]> {
  const db = adminDb();
  if (opts.email) {
    const snap = await resolveUserDoc(opts.email);
    return snap?.exists ? [snap] : [];
  }
  if (opts.uids?.length) {
    const snaps = await Promise.all(
      opts.uids.map((uid) => db.collection("users").doc(uid).get())
    );
    return snaps.filter((s) => s.exists);
  }
  if (opts.certifiedOnly === false) {
    const q = await db.collection("users").where("role", "==", "attendee").get();
    return q.docs.filter((d) => !d.id.includes("@"));
  }
  const q = await db
    .collection("users")
    .where("userStatus", "==", "certified")
    .where("role", "==", "attendee")
    .get();
  return q.docs;
}

async function writeCredentialFields(
  doc: DocumentSnapshot,
  cred: CertifierCredentialSummary,
  extra?: Record<string, unknown>
) {
  await doc.ref.update({
    certifierCredentialId: cred.id,
    certifierCredentialPublicId: cred.publicId,
    certifierCredentialStatus: cred.status,
    certifierSyncedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
    ...extra,
  });
}

/** Link existing Certifier credentials onto user docs (does not issue new ones). */
export async function syncCertifierCredentials(
  opts: CertifierSyncOpts = {}
): Promise<CertifierSyncResult> {
  const targets = await loadSyncTargets(opts);
  const synced: CertifierSyncResult["syncedRows"] = [];
  const missing: CertifierSyncResult["missingRows"] = [];
  const failed: CertifierSyncResult["failedRows"] = [];

  for (const doc of targets) {
    const data = doc.data();
    if (!data) continue;
    const email = (data.email as string)?.trim();
    if (!email) {
      failed.push({ uid: doc.id, email: "", error: "No email" });
      continue;
    }
    try {
      const found = await searchCertifierCredentialsByEmail(email);
      const best = pickBestCertifierCredential(found);
      if (!best) {
        missing.push({ uid: doc.id, email });
        continue;
      }
      await writeCredentialFields(doc, best);
      synced.push({ uid: doc.id, email, credentialId: best.id });
    } catch (e) {
      failed.push({
        uid: doc.id,
        email,
        error: e instanceof Error ? e.message : "sync failed",
      });
    }
  }

  return {
    total: targets.length,
    synced: synced.length,
    missing: missing.length,
    failed: failed.length,
    syncedRows: synced,
    missingRows: missing,
    failedRows: failed,
  };
}

export type IssueCertifierOpts = {
  uidOrEmail: string;
  /** Default: CERTIFIER_GROUP_ID. */
  groupId?: string;
  /** Scope skipIfExists + stored ids to this cohort (never reuse June). */
  cohortId?: string;
  /** Stored on the per-cohort credential; chooses group when groupId omitted. */
  kind?: "participation" | "completion";
  /** If a credential already exists, link it and skip issue (default true). */
  skipIfExists?: boolean;
  /** Also set users.userStatus = certified (default true). */
  markCertified?: boolean;
};

function cohortCredential(
  data: Record<string, unknown>,
  cohortId: string
): { credentialId: string; publicId: string; status: string; issuedAt?: string } | null {
  const map = data.certifierCredentials;
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const row = (map as Record<string, unknown>)[cohortId];
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const credentialId = String(rec.credentialId || "");
  const publicId = String(rec.publicId || "");
  if (!credentialId || !publicId) return null;
  return {
    credentialId,
    publicId,
    status: String(rec.status || "issued"),
    issuedAt: typeof rec.issuedAt === "string" ? rec.issuedAt : undefined,
  };
}

function toSummaryFromCohort(
  row: { credentialId: string; publicId: string; status: string; issuedAt?: string },
  email: string
): CertifierCredentialSummary {
  return {
    id: row.credentialId,
    publicId: row.publicId,
    status: row.status,
    recipientEmail: email,
    recipientName: "",
    issueDate: row.issuedAt,
    viewUrl: certifierCredentialViewUrl(row.publicId),
  };
}

export type IssueCertifierResult = {
  uid: string;
  email: string;
  alreadyIssued: boolean;
  markedCertified: boolean;
  credential: CertifierCredentialSummary;
};

/** Issue + email a Credsverse credential, then store ids on the user. */
export async function issueCertifierCredential(
  opts: IssueCertifierOpts
): Promise<IssueCertifierResult> {
  const snap = await resolveUserDoc(opts.uidOrEmail);
  if (!snap?.exists) {
    throw new AdminOpError(`User not found: ${opts.uidOrEmail}`, 404);
  }
  const data = snap.data() || {};
  const email = String(data.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new AdminOpError("User has no email — cannot issue a certificate", 400);
  }
  const name =
    (typeof data.displayName === "string" && data.displayName.trim()) ||
    email.split("@")[0] ||
    "Attendee";

  const cohortId = opts.cohortId?.trim() || "";
  const skipIfExists = opts.skipIfExists !== false;
  if (skipIfExists) {
    if (cohortId) {
      const existingCohort = cohortCredential(data, cohortId);
      if (existingCohort) {
        const markCertified = opts.markCertified !== false;
        return {
          uid: snap.id,
          email,
          alreadyIssued: true,
          markedCertified: markCertified,
          credential: toSummaryFromCohort(existingCohort, email),
        };
      }
    } else {
      const existing = pickBestCertifierCredential(
        await searchCertifierCredentialsByEmail(email)
      );
      if (existing) {
        const markCertified = opts.markCertified !== false;
        await writeCredentialFields(
          snap,
          existing,
          markCertified ? { userStatus: "certified" } : undefined
        );
        return {
          uid: snap.id,
          email,
          alreadyIssued: true,
          markedCertified: markCertified,
          credential: existing,
        };
      }
    }
  }

  let groupId: string;
  try {
    groupId =
      opts.groupId?.trim() ||
      (opts.kind ? certifierGroupForKind(opts.kind) : undefined) ||
      (cohortId ? certifierGroupIdForCohort(cohortId) : certifierGroupId());
  } catch (e) {
    throw new AdminOpError(
      e instanceof Error ? e.message : "CERTIFIER_GROUP_ID is not configured",
      503
    );
  }

  let issued: CertifierCredentialSummary;
  try {
    issued = await createIssueSendCredential({
      groupId,
      name,
      email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Certifier issue failed";
    if (msg.includes("CERTIFIER_API_TOKEN")) {
      throw new AdminOpError("Set CERTIFIER_API_TOKEN in server environment", 503);
    }
    throw new AdminOpError(msg, 502);
  }

  const markCertified = opts.markCertified !== false;
  const extra: Record<string, unknown> = markCertified ? { userStatus: "certified" } : {};
  if (cohortId) {
    extra[`certifierCredentials.${cohortId}`] = {
      credentialId: issued.id,
      publicId: issued.publicId,
      status: issued.status,
      issuedAt: new Date().toISOString(),
      ...(opts.kind ? { kind: opts.kind } : {}),
      groupId,
    };
  }
  await writeCredentialFields(snap, issued, extra);

  return {
    uid: snap.id,
    email,
    alreadyIssued: false,
    markedCertified: markCertified,
    credential: issued,
  };
}

export const CERTIFIER_FREE_PLAN_QUOTA = 250;

export type BulkIssueRow = {
  uid: string;
  displayName: string;
  outcome: "issued" | "already-issued" | "failed" | "would-issue";
  error?: string;
};

export async function bulkIssueCohortCertificates(opts: {
  cohortId?: string;
  actorUid: string;
  dryRun: boolean;
}): Promise<{
  cohortId: string;
  dryRun: boolean;
  quota: number;
  wouldIssue: number;
  alreadyIssued: number;
  issued: number;
  failed: number;
  rows: BulkIssueRow[];
}> {
  const cohortId = opts.cohortId?.trim() || SEPTEMBER_2026_COHORT_ID;
  const members = await adminDb()
    .collection("users")
    .where("cohortIds", "array-contains", cohortId)
    .get();

  const candidates: DocumentSnapshot[] = [];
  for (const doc of members.docs) {
    if (doc.id.includes("@")) continue;
    const data = doc.data() || {};
    if (data.role === "admin" || data.role === "moderator") continue;
    const part = (data.cohortParticipation || {})[cohortId] as
      | { status?: string }
      | undefined;
    if (part?.status !== "certified") continue;
    candidates.push(doc);
  }

  const rows: BulkIssueRow[] = [];
  let alreadyIssued = 0;
  let wouldIssue = 0;
  let issued = 0;
  let failed = 0;

  for (const doc of candidates) {
    const data = doc.data() || {};
    const displayName = String(data.displayName || "");
    const existing = cohortCredential(data, cohortId);
    if (existing) {
      alreadyIssued += 1;
      rows.push({ uid: doc.id, displayName, outcome: "already-issued" });
      continue;
    }
    if (opts.dryRun) {
      wouldIssue += 1;
      rows.push({ uid: doc.id, displayName, outcome: "would-issue" });
      continue;
    }
    try {
      const result = await issueCertifierCredential({
        uidOrEmail: doc.id,
        cohortId,
        skipIfExists: true,
        markCertified: true,
      });
      if (result.alreadyIssued) {
        alreadyIssued += 1;
        rows.push({ uid: doc.id, displayName, outcome: "already-issued" });
      } else {
        issued += 1;
        rows.push({ uid: doc.id, displayName, outcome: "issued" });
      }
    } catch (e) {
      failed += 1;
      rows.push({
        uid: doc.id,
        displayName,
        outcome: "failed",
        error: e instanceof Error ? e.message : "issue failed",
      });
    }
  }

  return {
    cohortId,
    dryRun: opts.dryRun,
    quota: CERTIFIER_FREE_PLAN_QUOTA,
    wouldIssue,
    alreadyIssued,
    issued,
    failed,
    rows,
  };
}
