/**
 * Recompute September 2026 per-cohort certification from attendance.
 * Does not issue Certifier credentials or send email. Does not close the cohort.
 *
 *   npx tsx --env-file=.env.local scripts/migrate-september-certification.ts
 *   npx tsx --env-file=.env.local scripts/migrate-september-certification.ts --apply
 */

import { SEPTEMBER_2026_COHORT_ID } from "../src/lib/cohorts";
import {
  applyCohortCertification,
  previewCloseCohort,
} from "../src/lib/server/closeCohort";

function arg(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const apply = arg("--apply");
  const preview = await previewCloseCohort(SEPTEMBER_2026_COHORT_ID);
  const got = preview.qualifying.map((r) => r.displayName || r.uid);

  console.log(
    `counted=${preview.countedSessionIds.length} required=${preview.required} qualifying=${got.length}`
  );
  console.log("qualifying:", got.join(", "));
  console.log(
    "one session short:",
    preview.oneSessionShort.map((r) => r.displayName || r.uid).join(", ")
  );

  if (!apply) {
    console.log("Dry run from live attendance. Pass --apply to write per-cohort status.");
    return;
  }

  const result = await applyCohortCertification({
    cohortId: SEPTEMBER_2026_COHORT_ID,
    actorUid: "script:migrate-september-certification",
  });
  console.log(`Applied. written=${result.written} skipped=${result.skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
