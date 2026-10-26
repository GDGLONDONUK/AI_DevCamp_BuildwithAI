/**
 * @deprecated Prefer `programmeProjects.ts`.
 * Re-exports keep older imports working — same `projects` collection / schema.
 */

export {
  toPublicProjectCard as toPublicHackathonProject,
  findUserCohortProject,
  listPublicHackathonIdeas,
  listVoteableProjects,
  bumpProjectVoteTotal,
  type PublicProjectCard as PublicHackathonProject,
} from "@/lib/server/programmeProjects";

import { findUserCohortProject } from "@/lib/server/programmeProjects";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";

/** Legacy helper — resolves live cohort then finds the shared programme project. */
export async function findUserHackathonProject(uid: string) {
  const cohortId = await resolveActiveCohortIdFromDb();
  return findUserCohortProject(uid, cohortId);
}