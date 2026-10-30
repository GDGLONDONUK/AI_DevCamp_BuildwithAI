/**
 * Seed / update hackathonSettings/main.
 *
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --submissions-open
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --voting-open
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --voting-closed
 */

import { adminDb } from "../src/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "../src/lib/hackathon";
import { DEFAULT_HACKATHON_PRIZES } from "../src/lib/hackathonContent";

async function main() {
  const payload: Record<string, unknown> = {
    hackathonId: DEVCAMP_HACKATHON_ID,
    prizes: DEFAULT_HACKATHON_PRIZES,
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
  console.log(JSON.stringify({ ok: true, wrote: payload, stored: after.data() }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
