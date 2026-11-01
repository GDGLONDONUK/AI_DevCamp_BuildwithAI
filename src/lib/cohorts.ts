/**
 * Cohort identifiers and helpers.
 * Active programme: September 2026 (Build → Scale → Govern → Optimise).
 * Spring (April–May 2026) is completed and kept for history / admin filters.
 */

export const SPRING_2026_COHORT_ID = "cohort-june-2026";
export const SEPTEMBER_2026_COHORT_ID = "cohort-september-2026";
export const APRIL_2027_COHORT_ID = "cohort-april-2027";

/** Default enrolment cohort when env / Firestore is unset. */
export const DEFAULT_ACTIVE_COHORT_ID = SEPTEMBER_2026_COHORT_ID;

/** Programme lifecycle used after September close (maps older planning/active/completed). */
export type CohortLifecycle = "upcoming" | "live" | "closed";

export type CohortStatus =
  | "planning"
  | "registration"
  | "active"
  | "completed"
  | CohortLifecycle;

export function normalizeCohortLifecycle(
  status: string | undefined | null,
  isCurrent?: boolean
): CohortLifecycle {
  const s = String(status || "").toLowerCase();
  if (s === "closed" || s === "completed") return "closed";
  if (s === "upcoming" || s === "planning" || s === "registration") return "upcoming";
  if (s === "live" || s === "active") return "live";
  return isCurrent ? "live" : "upcoming";
}

export type CohortParticipation = {
  status: string;
  joinedAt: string;
  role?: "attendee" | "moderator" | "admin";
  certifiedAt?: string;
  certificationRule?: string;
  certificateShareId?: string;
};

/**
 * Sync helper for client bundles and scripts.
 * Server/MCP/learning paths should prefer `resolveActiveCohortIdFromDb()`
 * (`src/lib/server/activeCohort.ts`) — Firestore `cohorts.isCurrent` is the source of truth.
 */
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
