/**
 * GET  /api/admin/hackathon — day-of board (projects, votes, settings)
 * PATCH /api/admin/hackathon — { votingOpen?, submissionsOpen?, votingMessage?, winnersAnnounced? }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, ok, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { updateHackathonSettings } from "@/lib/server/hackathonSettings";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { buildHackathonBoard } from "@/lib/server/hackathonOps";
import { adminRouteError } from "@/lib/server/admin/http";

const patchSchema = z.object({
  votingOpen: z.boolean().optional(),
  submissionsOpen: z.boolean().optional(),
  votingMessage: z.string().max(500).optional(),
  winnersAnnounced: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const [board, cohortId] = await Promise.all([
      buildHackathonBoard(),
      resolveActiveCohortIdFromDb(),
    ]);
    return ok({
      ...board,
      cohortId,
      hackathonId: DEVCAMP_HACKATHON_ID,
      count: board.projects.length,
      settings: {
        votingOpen: board.settings.votingOpen,
        submissionsOpen: board.settings.submissionsOpen,
        winnersAnnounced: board.settings.winnersAnnounced,
        votingMessage: board.settings.votingMessage || "",
      },
    });
  } catch (e) {
    return adminRouteError("GET /api/admin/hackathon", e, "Failed to load hackathon admin data");
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) return parsed.response;
    const settings = await updateHackathonSettings(auth.uid, parsed.data);
    return ok({
      updated: true,
      hackathonId: DEVCAMP_HACKATHON_ID,
      ...parsed.data,
      settings,
    });
  } catch (e) {
    return adminRouteError("PATCH /api/admin/hackathon", e, "Failed to update hackathon settings");
  }
}
