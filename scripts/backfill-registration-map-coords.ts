/**
 * Pre-geocode registration locations and write coordinates onto each `users/*` document
 * so the admin users map loads quickly without waiting on Nominatim.
 *
 * Usage (repo root, Firebase Admin env in .env.local):
 *   npm run backfill-registration-map-coords
 *   npm run backfill-registration-map-coords -- --force
 *
 * `--force` ignores stored coords and re-queries Nominatim for every place group
 * (slow; respect OSM rate limits).
 */

import { computeUsersLocationMapPayload } from "../src/lib/server/registrationMapSync";

async function main() {
  const force = process.argv.includes("--force");
  console.log(force ? "Mode: force (re-geocode all groups)\n" : "Mode: fill missing / stale only\n");

  const { payload, stats } = await computeUsersLocationMapPayload({ force });

  console.log(
    JSON.stringify(
      {
        points: payload.points.length,
        failed: payload.failed.length,
        skippedNoLocation: payload.skippedNoLocation,
        nominatimRequests: stats.nominatimRequests,
        userDocsUpdated: stats.userDocsUpdated,
        groupsServedFromCache: stats.groupsServedFromCache,
      },
      null,
      2
    )
  );

  if (payload.failed.length > 0) {
    console.warn(
      "\nSome users could not be placed (Nominatim returned no result). See API payload `failed` for details."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
