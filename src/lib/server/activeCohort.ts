/**
 * Live programme cohort — source of truth is Firestore `cohorts/{id}`.
 *
 * Mark exactly one cohort with `isCurrent: true` (see open-september-2026-cohort /
 * sync). Env `NEXT_PUBLIC_ACTIVE_COHORT_ID` is a fallback for clients / cold start.
 *
 * No `server-only` — safe for Node MCP / ops scripts (Admin SDK only).
 */

import { adminDb } from "@/lib/firebase-admin";
import {
  getActiveCohortId,
  type CohortStatus,
} from "@/lib/cohorts";

const CACHE_MS = 60_000;
let cache: { id: string; at: number } | null = null;

/**
 * Resolve the current programme cohort id from the database.
 * Preference: `isCurrent === true` → status active/registration (newest) → env/default.
 */
export async function resolveActiveCohortIdFromDb(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.id;

  const fallback = getActiveCohortId();
  try {
    const db = adminDb();
    const currentSnap = await db
      .collection("cohorts")
      .where("isCurrent", "==", true)
      .limit(2)
      .get();

    if (!currentSnap.empty) {
      const id = currentSnap.docs[0].id;
      if (currentSnap.size > 1) {
        console.warn(
          "[activeCohort] Multiple cohorts have isCurrent=true; using",
          id
        );
      }
      cache = { id, at: now };
      return id;
    }

    const all = await db.collection("cohorts").get();
    const live = all.docs
      .map((d) => {
        const data = d.data();
        const status = String(data.status || "") as CohortStatus | string;
        const start =
          data.startDate?.toDate?.()?.getTime?.() ??
          (typeof data.startDate === "string" ? Date.parse(data.startDate) : 0);
        return { id: d.id, status, start: Number.isFinite(start) ? start : 0 };
      })
      .filter((c) => c.status === "active" || c.status === "registration")
      .sort((a, b) => b.start - a.start);

    const id = live[0]?.id || fallback;
    cache = { id, at: now };
    return id;
  } catch (e) {
    console.error("[activeCohort] Firestore resolve failed, using env/default", e);
    cache = { id: fallback, at: now };
    return fallback;
  }
}

/** Test / ops helper — clear in-memory cache after seeding cohorts. */
export function clearActiveCohortCache(): void {
  cache = null;
}
