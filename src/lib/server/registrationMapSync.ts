/**
 * Admin users map: derive place labels from profile fields, resolve coordinates
 * (Nominatim), and persist results on each `users/*` doc so repeat loads stay fast.
 */

import { adminDb } from "@/lib/firebase-admin";
import { userSnapshotToAdminProfile } from "@/lib/server/userAdminView";
import { geocodeNominatim, nominatimDelay } from "@/lib/server/nominatimGeocode";
import type { UserMapPayload, UserMapPoint, UserProfile } from "@/types";

const BATCH_SIZE = 400;

/** Normalized key for grouping equivalent place strings (whitespace-insensitive). */
export function registrationMapGroupKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Same rules as the admin map: prefer `location`, else "city, country". */
export function registrationLocationLabel(
  u: Pick<UserProfile, "location" | "city" | "country">
): string {
  const loc = (u.location || "").trim();
  if (loc) return loc;
  const parts = [u.city, u.country].filter(
    (x) => x && String(x).trim().length > 0
  ) as string[];
  return parts.map((x) => String(x).trim()).join(", ");
}

export function registrationMapCoordsIfValid(u: UserProfile): { lat: number; lon: number } | null {
  const label = registrationLocationLabel(u);
  if (label.length <= 2) return null;
  const storedLabel = u.registrationMapLabel;
  const lat = u.registrationMapLat;
  const lon = u.registrationMapLon;
  if (typeof storedLabel !== "string" || typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (registrationMapGroupKey(storedLabel) !== registrationMapGroupKey(label)) {
    return null;
  }
  return { lat, lon };
}

export async function persistRegistrationMapCoords(
  firestoreDocIds: string[],
  label: string,
  lat: number,
  lon: number
): Promise<void> {
  if (firestoreDocIds.length === 0) return;
  const db = adminDb();
  const iso = new Date().toISOString();
  const patch = {
    registrationMapLabel: label,
    registrationMapLat: lat,
    registrationMapLon: lon,
    registrationMapGeocodedAt: iso,
  };
  for (let i = 0; i < firestoreDocIds.length; i += BATCH_SIZE) {
    const chunk = firestoreDocIds.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const id of chunk) {
      batch.set(db.collection("users").doc(id), patch, { merge: true });
    }
    await batch.commit();
  }
}

export type RegistrationMapSyncStats = {
  nominatimRequests: number;
  userDocsUpdated: number;
  groupsServedFromCache: number;
};

export type RegistrationMapComputeOptions = {
  /** Ignore stored coords and call Nominatim for every non-empty place group. */
  force?: boolean;
};

export async function computeUsersLocationMapPayload(
  options: RegistrationMapComputeOptions = {}
): Promise<{ payload: UserMapPayload; stats: RegistrationMapSyncStats }> {
  const force = options.force === true;
  const snap = await adminDb().collection("users").get();
  const list = snap.docs.map((d) => userSnapshotToAdminProfile(d));

  const byKey = new Map<string, { label: string; users: UserProfile[] }>();
  let skipped = 0;
  for (const u of list) {
    const label = registrationLocationLabel(u);
    if (label.length <= 2) {
      skipped++;
      continue;
    }
    const k = registrationMapGroupKey(label);
    if (!byKey.has(k)) {
      byKey.set(k, { label, users: [] });
    }
    byKey.get(k)!.users.push(u);
  }

  const stats: RegistrationMapSyncStats = {
    nominatimRequests: 0,
    userDocsUpdated: 0,
    groupsServedFromCache: 0,
  };

  const coordByKey = new Map<string, { lat: number; lon: number }>();
  let didNominatim = false;

  for (const { label, users } of byKey.values()) {
    if (users.length === 0) continue;
    const k = registrationMapGroupKey(label);
    const docIds = users
      .map((u) => u.firestoreId || u.email || u.uid)
      .filter((id): id is string => Boolean(id));

    let g: { lat: number; lon: number } | null = null;

    if (!force) {
      for (const u of users) {
        const c = registrationMapCoordsIfValid(u);
        if (c) {
          g = c;
          break;
        }
      }
    }

    if (g) {
      stats.groupsServedFromCache++;
      coordByKey.set(k, g);
      const missing = users.filter((u) => !registrationMapCoordsIfValid(u));
      const missingIds = missing
        .map((u) => u.firestoreId || u.email || u.uid)
        .filter((id): id is string => Boolean(id));
      if (missingIds.length > 0) {
        await persistRegistrationMapCoords(missingIds, label, g.lat, g.lon);
        stats.userDocsUpdated += missingIds.length;
      }
      continue;
    }

    if (didNominatim) await nominatimDelay();
    didNominatim = true;
    stats.nominatimRequests++;
    const resolved = await geocodeNominatim(label);
    if (resolved) {
      coordByKey.set(k, resolved);
      if (docIds.length > 0) {
        await persistRegistrationMapCoords(docIds, label, resolved.lat, resolved.lon);
        stats.userDocsUpdated += docIds.length;
      }
    }
  }

  const points: UserMapPoint[] = [];
  const failed: UserMapPayload["failed"] = [];

  for (const { label, users } of byKey.values()) {
    const k = registrationMapGroupKey(label);
    const coord = coordByKey.get(k);
    if (!coord) {
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
        lat: coord.lat + Math.sin(angle) * r,
        lon: coord.lon + Math.cos(angle) * r,
        userStatus: u.userStatus,
      });
    });
  }

  return {
    payload: { points, failed, skippedNoLocation: skipped },
    stats,
  };
}
