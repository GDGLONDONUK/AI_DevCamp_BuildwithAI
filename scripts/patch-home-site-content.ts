/**
 * Patch home siteContent: Discord invite + cohort announcement banner.
 * Usage: npx tsx --env-file=.env.local scripts/patch-home-site-content.ts
 */

import { adminDb } from "../src/lib/firebase-admin";
import {
  HOME_SITE_CONTENT_DOC_ID,
  SITE_CONTENT_COLLECTION,
} from "../src/lib/siteContent";

async function main() {
  const now = new Date().toISOString();
  const patch = {
    discordInviteUrl: "https://discord.gg/jRBz8nsch",
    announcementBanner: {
      enabled: true,
      text: "NEXT COHORT: 23 SEPTEMBER 2026 (Wed) · 3 HR",
    },
    updatedAt: now,
    updatedByUid: "patch-home-site-content",
  };

  await adminDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(HOME_SITE_CONTENT_DOC_ID)
    .set(patch, { merge: true });

  console.log(JSON.stringify({ ok: true, path: `${SITE_CONTENT_COLLECTION}/${HOME_SITE_CONTENT_DOC_ID}`, patch }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
