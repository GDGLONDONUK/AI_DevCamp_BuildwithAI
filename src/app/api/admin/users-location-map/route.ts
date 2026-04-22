/**
 * GET /api/admin/users-location-map
 * Geocodes user locations (city/country/location) for map display. Admin or moderator.
 * Nominatim: ~1 request/sec, with in-process caching.
 */
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { err, ok, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { userSnapshotToAdminProfile } from "@/lib/server/userAdminView";
import { geocodeNominatim, nominatimDelay } from "@/lib/server/nominatimGeocode";
import type { UserMapPayload, UserMapPoint, UserProfile } from "@/types";

function labelForUser(u: UserProfile): string {
  const loc = (u.location || "").trim();
  if (loc) return loc;
  const parts = [u.city, u.country].filter(
    (x) => x && String(x).trim().length > 0
  ) as string[];
  return parts.map((x) => String(x).trim()).join(", ");
}

export async function GET(_request: NextRequest) {
  const auth = await requireAdmin(_request);
  if (isErrorResponse(auth)) return auth;

  const snap = await adminDb().collection("users").get();
  const list = snap.docs.map((d) => userSnapshotToAdminProfile(d));

  const byKey = new Map<string, { label: string; users: UserProfile[] }>();
  let skipped = 0;
  for (const u of list) {
    const label = labelForUser(u);
    if (label.length <= 2) {
      skipped++;
      continue;
    }
    const k = label.toLowerCase();
    if (!byKey.has(k)) {
      byKey.set(k, { label, users: [] });
    }
    byKey.get(k)!.users.push(u);
  }

  const coordByKey = new Map<string, { lat: number; lon: number }>();
  let firstReq = true;
  for (const { label, users } of byKey.values()) {
    if (users.length === 0) continue;
    if (!firstReq) await nominatimDelay();
    firstReq = false;
    const g = await geocodeNominatim(label);
    if (g) {
      coordByKey.set(label.toLowerCase(), g);
    }
  }

  const points: UserMapPoint[] = [];
  const failed: UserMapPayload["failed"] = [];

  for (const { label, users } of byKey.values()) {
    const k = label.toLowerCase();
    const g = coordByKey.get(k);
    if (!g) {
      for (const u of users) {
        failed.push({
          displayName: u.displayName || "—",
          email: u.email || "",
          label,
        });
      }
      continue;
    }
    const n = users.length;
    users.forEach((u, i) => {
      const angle = n > 1 ? (i * 2 * Math.PI) / n : 0;
      const r = n > 1 ? 0.0011 * Math.sqrt(n) : 0;
      points.push({
        docId: u.firestoreId || u.email || u.uid,
        displayName: u.displayName || "—",
        email: u.email || "",
        label,
        lat: g.lat + Math.sin(angle) * r,
        lon: g.lon + Math.cos(angle) * r,
        userStatus: u.userStatus,
      });
    });
  }

  return ok({
    points,
    failed,
    skippedNoLocation: skipped,
  } satisfies UserMapPayload);
}
