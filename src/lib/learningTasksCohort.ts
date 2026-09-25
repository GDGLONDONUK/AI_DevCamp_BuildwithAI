/**
 * Cohort helpers for learning-task catalogue + private checklists.
 */

import {
  SEPTEMBER_2026_COHORT_ID,
  SPRING_2026_COHORT_ID,
  getActiveCohortId,
} from "@/lib/cohorts";

export function resolveLearningTasksCohortId(explicit?: string | null): string {
  const t = explicit?.trim();
  return t || getActiveCohortId();
}

/** Whether a task/template row belongs to the given cohort (incl. legacy untagged spring rows). */
export function learningItemBelongsToCohort(
  item: { cohortId?: string | null; sessionKey?: string | null },
  cohortId: string
): boolean {
  const tagged = typeof item.cohortId === "string" ? item.cohortId.trim() : "";
  if (tagged) return tagged === cohortId;

  const key = typeof item.sessionKey === "string" ? item.sessionKey.trim() : "";
  if (cohortId === SEPTEMBER_2026_COHORT_ID) {
    return key.startsWith("sept-2026-") || key === "general";
  }
  if (cohortId === SPRING_2026_COHORT_ID) {
    return /^session-\d+$/i.test(key) || key === "general" || key.startsWith("bootcamp");
  }
  return false;
}
