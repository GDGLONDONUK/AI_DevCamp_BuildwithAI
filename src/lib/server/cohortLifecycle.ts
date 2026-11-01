/**
 * Cohort lifecycle + enrolment. Closed programmes reject check-in / submissions / votes.
 * Registration stays open onto the enrolment cohort (upcoming/live, not closed).
 */

import { adminDb } from "@/lib/firebase-admin";
import { getActiveCohortId, normalizeCohortLifecycle, type CohortLifecycle } from "@/lib/cohorts";
import { isCohortClosedLifecycle, pickEnrolmentCohortId } from "@/lib/cohortEnrolment";
import { AdminOpError } from "@/lib/server/admin/errors";

export { isCohortClosedLifecycle, pickEnrolmentCohortId };

const CACHE_MS = 30_000;
let cache: { at: number; byId: Map<string, CohortLifecycle>; enrolmentId: string } | null =
  null;


async function loadLifecycleCache() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache;
  const fallback = getActiveCohortId();
  const byId = new Map<string, CohortLifecycle>();
  let enrolmentId = fallback;
  try {
    const snap = await adminDb().collection("cohorts").get();
    const rows = snap.docs.map((d) => {
      const data = d.data();
      const life = normalizeCohortLifecycle(
        typeof data.status === "string" ? data.status : undefined,
        data.isCurrent === true
      );
      byId.set(d.id, life);
      return { id: d.id, life, isCurrent: data.isCurrent === true };
    });
    enrolmentId = pickEnrolmentCohortId(rows, fallback);
  } catch (e) {
    console.error("[cohortLifecycle] load failed", e);
  }
  cache = { at: now, byId, enrolmentId };
  return cache;
}

export function clearCohortLifecycleCache() {
  cache = null;
}

export async function resolveEnrolmentCohortId(): Promise<string> {
  const c = await loadLifecycleCache();
  return c.enrolmentId;
}

export async function getCohortLifecycle(cohortId: string): Promise<CohortLifecycle> {
  const c = await loadLifecycleCache();
  return c.byId.get(cohortId) || normalizeCohortLifecycle(undefined, false);
}

export async function assertCohortAcceptsSubmissions(cohortId: string): Promise<void> {
  const life = await getCohortLifecycle(cohortId);
  if (isCohortClosedLifecycle(life)) {
    throw new AdminOpError("This cohort is closed — submissions and voting are finished", 403);
  }
}

export async function assertCohortAcceptsCheckIn(cohortId: string): Promise<void> {
  const life = await getCohortLifecycle(cohortId);
  if (isCohortClosedLifecycle(life)) {
    throw new AdminOpError("This cohort is closed — self check-in is finished", 403);
  }
}
