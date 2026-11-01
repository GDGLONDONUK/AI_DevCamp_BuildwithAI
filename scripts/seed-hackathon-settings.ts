/**
 * Seed / update hackathonSettings/main.
 *
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --submissions-open
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --voting-open
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --voting-closed
 */

import { adminDb } from "../src/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "../src/lib/hackathon";
import { DEFAULT_HACKATHON_PUBLIC_CONTENT } from "../src/lib/hackathonContent";

async function main() {
  const payload: Record<string, unknown> = {
    hackathonId: DEVCAMP_HACKATHON_ID,
    prizes: DEFAULT_HACKATHON_PUBLIC_CONTENT.prizes,
    rulesSections: DEFAULT_HACKATHON_PUBLIC_CONTENT.rulesSections,
    judgingCriteria: DEFAULT_HACKATHON_PUBLIC_CONTENT.judgingCriteria,
    starterLinks: DEFAULT_HACKATHON_PUBLIC_CONTENT.starterLinks,
    resourceLinks: DEFAULT_HACKATHON_PUBLIC_CONTENT.resourceLinks,
    hauntedKioskUrl: DEFAULT_HACKATHON_PUBLIC_CONTENT.hauntedKioskUrl,
    hauntedKioskBuildUrl: DEFAULT_HACKATHON_PUBLIC_CONTENT.hauntedKioskBuildUrl,
    updatedAt: new Date().toISOString(),
  };
  if (process.argv.includes("--submissions-open")) payload.submissionsOpen = true;
  if (process.argv.includes("--submissions-closed")) payload.submissionsOpen = false;
  if (process.argv.includes("--voting-open")) payload.votingOpen = true;
  if (process.argv.includes("--voting-closed")) payload.votingOpen = false;
  if (process.argv.includes("--winners-clear")) payload.winnersAnnounced = false;

  const ref = adminDb().collection("hackathonSettings").doc("main");
  await ref.set(payload, { merge: true });
  const after = await ref.get();
  const stored = after.data() || {};
  console.log(
    JSON.stringify(
      {
        ok: true,
        prizeCount: Array.isArray(stored.prizes) ? stored.prizes.length : 0,
        starterLinkCount: Array.isArray(stored.starterLinks) ? stored.starterLinks.length : 0,
        rulesCount: Array.isArray(stored.rulesSections) ? stored.rulesSections.length : 0,
        submissionsOpen: stored.submissionsOpen,
        votingOpen: stored.votingOpen,
        winnersAnnounced: stored.winnersAnnounced,
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
