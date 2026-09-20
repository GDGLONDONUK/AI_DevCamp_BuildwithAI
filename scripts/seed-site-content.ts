/**
 * Seed Firestore siteContent/home with default marketing copy.
 * Usage: npx tsx --env-file=.env.local scripts/seed-site-content.ts
 */

import { adminDb } from "../src/lib/firebase-admin";
import {
  DEFAULT_HOME_SITE_CONTENT,
  HOME_SITE_CONTENT_DOC_ID,
  SITE_CONTENT_COLLECTION,
} from "../src/lib/siteContent";

async function main() {
  const now = new Date().toISOString();
  await adminDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(HOME_SITE_CONTENT_DOC_ID)
    .set(
      {
        ...DEFAULT_HOME_SITE_CONTENT,
        updatedAt: now,
        updatedByUid: "seed-script",
      },
      { merge: true }
    );

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: `${SITE_CONTENT_COLLECTION}/${HOME_SITE_CONTENT_DOC_ID}`,
        updatedAt: now,
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
