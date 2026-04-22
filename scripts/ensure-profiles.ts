/**
 * Backfill `users/{uid}` for one or more emails (same logic as POST /api/me/ensure-profile).
 *
 * Usage (from repo root, with Firebase Admin env set):
 *   npx tsx --env-file=.env.local scripts/ensure-profiles.ts email1@x.com email2@y.com
 */

import { ensureUserProfileForEmail } from "../src/lib/server/ensureUserProfileDocument";

async function main() {
  const emails = process.argv.slice(2).filter(Boolean);
  if (emails.length === 0) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/ensure-profiles.ts <email> [email...]");
    process.exit(1);
  }

  for (const email of emails) {
    try {
      const r = await ensureUserProfileForEmail(email);
      console.log(
        JSON.stringify(
          {
            email: r.email,
            uid: r.uid,
            created: r.created,
            profileExists: r.profileExists,
            preRegistrationMatched: r.preRegistrationMatched,
          },
          null,
          2
        )
      );
    } catch (e) {
      console.error(`[${email}]`, e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
