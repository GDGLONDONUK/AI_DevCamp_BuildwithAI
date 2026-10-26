/**
 * Seed hackathonSettings/main (voting closed by default; open on event day).
 *
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-settings.ts --voting-open
 */

import { adminDb } from "../src/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "../src/lib/hackathon";
import { DEFAULT_HACKATHON_PRIZES } from "../src/lib/hackathonContent";

const votingOpen = process.argv.includes("--voting-open");

async function main() {
  const ref = adminDb().collection("hackathonSettings").doc("main");
  await ref.set(
    {
      hackathonId: DEVCAMP_HACKATHON_ID,
      votingOpen,
      winnersAnnounced: false,
      prizes: DEFAULT_HACKATHON_PRIZES,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log(JSON.stringify({ ok: true, votingOpen, hackathonId: DEVCAMP_HACKATHON_ID }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
