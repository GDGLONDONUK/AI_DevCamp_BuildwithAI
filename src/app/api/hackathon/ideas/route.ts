/**
 * GET /api/hackathon/ideas — public idea gallery from shared `projects` collection.
 */

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { listPublicHackathonIdeas } from "@/lib/server/programmeProjects";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";

export async function GET(req: NextRequest) {
  try {
    const openOnly = req.nextUrl.searchParams.get("open") === "1";
    const cohortId = await resolveActiveCohortIdFromDb();
    const ideas = await listPublicHackathonIdeas(cohortId, { openOnly });
    return ok({ count: ideas.length, ideas });
  } catch (e) {
    logServerRouteException("GET /api/hackathon/ideas", e);
    return err("Failed to load ideas", 500);
  }
}
