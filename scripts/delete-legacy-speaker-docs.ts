/**
 * Removes superseded `speakers/{id}` documents from Firestore (pre–roster-refactor ids).
 *
 *   npx tsx --env-file=.env.local scripts/delete-legacy-speaker-docs.ts
 *
 * Or: npm run delete-legacy-speaker-docs
 */

import { adminDb } from "../src/lib/firebase-admin";

const LEGACY_SPEAKER_IDS = [
  "salih-guests",
  "renuka",
  "surprise-guest",
  "nishi-ajmerra",
] as const;

async function main() {
  const db = adminDb();
  const deleted: string[] = [];
  const missing: string[] = [];

  for (const id of LEGACY_SPEAKER_IDS) {
    const ref = db.collection("speakers").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      missing.push(id);
      continue;
    }
    await ref.delete();
    deleted.push(id);
  }

  console.log(
    JSON.stringify({ ok: true, deleted, alreadyAbsent: missing }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
