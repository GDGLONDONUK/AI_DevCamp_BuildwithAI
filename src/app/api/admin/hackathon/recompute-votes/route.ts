/**
 * POST /api/admin/hackathon/recompute-votes
 * Rebuild project voteTotal from hackathonVotes (Admin SDK).
 */

import { NextRequest } from "next/server";
import { requireAdmin, ok, isErrorResponse } from "@/lib/api-helpers";
import { recomputeHackathonVotesAndBoard } from "@/lib/server/hackathonOps";
import { adminRouteError } from "@/lib/server/admin/http";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    return ok(await recomputeHackathonVotesAndBoard());
  } catch (e) {
    return adminRouteError(
      "POST /api/admin/hackathon/recompute-votes",
      e,
      "Failed to recompute votes"
    );
  }
}
