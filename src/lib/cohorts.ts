/**
 * Cohort identifiers and helpers.
 * Active programme: September 2026 (Build → Scale → Govern → Optimise).
 * Spring (April–May 2026) is completed and kept for history / admin filters.
 */

export const SPRING_2026_COHORT_ID = "cohort-june-2026";
export const SEPTEMBER_2026_COHORT_ID = "cohort-september-2026";

/** Default active cohort when env is unset. */
export const DEFAULT_ACTIVE_COHORT_ID = SEPTEMBER_2026_COHORT_ID;

export type CohortStatus =
  | "planning"
  | "registration"
  | "active"
  | "completed";

export type CohortParticipation = {
  status: string;
  joinedAt: string;
  role?: "attendee" | "moderator" | "admin";
};

export function getActiveCohortId(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_ACTIVE_COHORT_ID?.trim()
      : undefined;
  return fromEnv || DEFAULT_ACTIVE_COHORT_ID;
}

export function userInCohort(
  cohortIds: string[] | undefined | null,
  cohortId: string
): boolean {
  return Array.isArray(cohortIds) && cohortIds.includes(cohortId);
}

export function sessionsForCohort<T extends { cohortId?: string }>(
  sessions: T[],
  cohortId: string
): T[] {
  return sessions.filter((s) => (s.cohortId || SPRING_2026_COHORT_ID) === cohortId);
}
