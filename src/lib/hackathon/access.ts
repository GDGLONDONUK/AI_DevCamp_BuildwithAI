import { userInCohort, getActiveCohortId } from "@/lib/cohorts";

/**
 * Who may enter the Agentic Hackathon on this site:
 * - enrolled in the live DevCamp cohort (final project = hackathon entry), or
 * - explicitly joined as a hackathon participant (open registrants).
 *
 * Pass `activeCohortId` from `resolveActiveCohortIdFromDb()` on the server.
 */
export function isHackathonEligible(
  user: {
    cohortIds?: string[] | null;
    hackathonParticipant?: boolean | null;
    role?: string | null;
  },
  activeCohortId?: string
): boolean {
  if (user.hackathonParticipant === true) return true;
  if (user.role === "admin" || user.role === "moderator") return true;
  return userInCohort(user.cohortIds, activeCohortId || getActiveCohortId());
}
