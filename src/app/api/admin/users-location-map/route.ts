/**
 * GET /api/admin/users-location-map
 * Geocodes user locations (city/country/location) for map display. Admin or moderator.
 * Coordinates are stored on each `users/*` doc after a successful lookup so repeat
 * requests avoid Nominatim except for new places. Use `npm run backfill-registration-map-coords`
 * to pre-fill offline. Nominatim policy: ~1 request/sec (in-process cache still applies).
 */
import { NextRequest } from "next/server";
import { err, ok, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { computeUsersLocationMapPayload } from "@/lib/server/registrationMapSync";

export async function GET(_request: NextRequest) {
  const auth = await requireAdmin(_request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { payload } = await computeUsersLocationMapPayload();
    return ok(payload);
  } catch (e) {
    logServerRouteException("GET /api/admin/users-location-map", e);
    return err("Failed to build users location map", 500);
  }
}
