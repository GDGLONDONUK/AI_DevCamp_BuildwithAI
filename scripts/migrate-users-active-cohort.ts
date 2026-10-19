/**
 * Align user cohort pointers with the live programme (Firestore `cohorts.isCurrent`).
 *
 * Does NOT auto-enrol spring-only alumni into the new cohort (they must Join).
 * Does:
 *   1. Organiser admins → enrol + set activeCohortId to live programme
 *   2. Staff (admin/moderator) → enrol if missing + set activeCohortId
 *   3. Anyone already in cohortIds for the live programme with a stale
 *      activeCohortId → point activeCohortId at the live programme
 *
 *   npm run migrate-users-active-cohort -- --dry-run
 *   npm run migrate-users-active-cohort -- --apply
 */

import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import {
  resolveActiveCohortIdFromDb,
  clearActiveCohortCache,
} from "../src/lib/server/activeCohort";
import { isOrganiserAdminEmail } from "../src/lib/organiserAdmins";

const BATCH_SIZE = 400;
const dryRun =
  process.argv.includes("--dry-run") || !process.argv.includes("--apply");

async function commitBatches(ops: Array<(batch: WriteBatch) => void>) {
  if (ops.length === 0 || dryRun) return;
  const db = adminDb();
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const slice = ops.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of slice) op(batch);
    await batch.commit();
  }
}

async function main() {
  clearActiveCohortCache();
  const live = await resolveActiveCohortIdFromDb();
  const db = adminDb();
  const snap = await db.collection("users").get();
  const nowIso = new Date().toISOString();

  let organiserEnrolled = 0;
  let staffUpdated = 0;
  let enrolledPointerFixed = 0;
  let skipped = 0;
  const samples: Array<{
    uid: string;
    email: string | null;
    reason: string;
    beforeActive: string | null;
    beforeIds: string[];
  }> = [];

  const ops: Array<(batch: WriteBatch) => void> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.accountDisabled === true || data.programOptOut === true) {
      skipped += 1;
      continue;
    }

    const email = typeof data.email === "string" ? data.email : null;
    const role = String(data.role || "attendee");
    const isStaff = role === "admin" || role === "moderator";
    const isOrganiser = isOrganiserAdminEmail(email);
    const ids: string[] = Array.isArray(data.cohortIds)
      ? data.cohortIds.map(String)
      : [];
    const active =
      typeof data.activeCohortId === "string" ? data.activeCohortId : null;
    const inLive = ids.includes(live);

    const patch: Record<string, unknown> = {};
    const reasons: string[] = [];

    if (isOrganiser || isStaff) {
      if (!inLive) {
        patch.cohortIds = FieldValue.arrayUnion(live);
        const prior =
          typeof data.cohortParticipation === "object" && data.cohortParticipation
            ? data.cohortParticipation
            : {};
        patch.cohortParticipation = {
          ...prior,
          [live]: {
            status: "participated",
            joinedAt:
              (prior as Record<string, { joinedAt?: string }>)[live]?.joinedAt ||
              nowIso,
            role: isOrganiser ? "admin" : role,
          },
        };
        reasons.push(isOrganiser ? "organiser-enrol" : "staff-enrol");
      }
      if (isOrganiser && data.role !== "admin") {
        patch.role = "admin";
        reasons.push("promote-admin");
      }
      if (active !== live) {
        patch.activeCohortId = live;
        reasons.push("staff-pointer");
      }
      if (reasons.length === 0) {
        skipped += 1;
        continue;
      }
      if (isOrganiser) organiserEnrolled += 1;
      else staffUpdated += 1;
    } else if (inLive && active !== live) {
      patch.activeCohortId = live;
      reasons.push("enrolled-stale-pointer");
      enrolledPointerFixed += 1;
    } else {
      skipped += 1;
      continue;
    }

    patch.updatedAt = FieldValue.serverTimestamp();

    if (samples.length < 25) {
      samples.push({
        uid: doc.id,
        email,
        reason: reasons.join("+"),
        beforeActive: active,
        beforeIds: ids,
      });
    }

    ops.push((batch) => batch.set(doc.ref, patch, { merge: true }));
  }

  await commitBatches(ops);
  clearActiveCohortCache();

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        liveCohortId: live,
        scanned: snap.size,
        wouldWrite: ops.length,
        organiserUpdated: organiserEnrolled,
        staffUpdated,
        enrolledPointerFixed,
        skipped,
        samples,
        hint: dryRun
          ? "Re-run with --apply to write changes"
          : "Wrote user cohort pointer updates",
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
