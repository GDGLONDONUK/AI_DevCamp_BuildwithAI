import { SPRING_2026_COHORT_ID, userInCohort } from "@/lib/cohorts";

/** Resolve the cohort a session belongs to (legacy docs may omit cohortId). */
export function sessionCohortId(session: { cohortId?: unknown } | undefined): string {
  const raw = session?.cohortId;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return SPRING_2026_COHORT_ID;
}

/**
 * Attendee may self-check-in only for sessions in a cohort they belong to.
 * Admins/mods may always (ops / testing during live sessions).
 */
export function canSelfCheckInForSessionCohort(
  user: { cohortIds?: unknown; role?: unknown } | undefined,
  cohortId: string
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "moderator") return true;
  const ids = Array.isArray(user.cohortIds) ? (user.cohortIds as string[]) : undefined;
  return userInCohort(ids, cohortId);
}
