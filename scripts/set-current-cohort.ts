/**
 * Mark one cohort as the live programme in Firestore (`isCurrent: true`).
 * Clears isCurrent on all other cohort docs.
 *
 *   npx tsx --env-file=.env.local scripts/set-current-cohort.ts --cohort=cohort-september-2026
 */

import { adminDb } from "../src/lib/firebase-admin";
import { clearActiveCohortCache } from "../src/lib/server/activeCohort";
import { SEPTEMBER_2026_COHORT_ID } from "../src/lib/cohorts";

const cohortArg = process.argv
  .find((a) => a.startsWith("--cohort="))
  ?.slice("--cohort=".length)
  ?.trim();
const cohortId = cohortArg || SEPTEMBER_2026_COHORT_ID;

async function main() {
  const db = adminDb();
  const snap = await db.collection("cohorts").get();
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const doc of snap.docs) {
    batch.set(
      doc.ref,
      {
        isCurrent: doc.id === cohortId,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  if (!snap.docs.some((d) => d.id === cohortId)) {
    batch.set(
      db.collection("cohorts").doc(cohortId),
      {
        cohortId,
        isCurrent: true,
        status: "active",
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();
  clearActiveCohortCache();
  console.log(
    JSON.stringify(
      {
        ok: true,
        currentCohortId: cohortId,
        cohortsUpdated: snap.size,
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
