/**
 * GET /api/admin/code-reviews  — review status for every project, for the Projects tab (admin/moderator only)
 *
 * Also keeps the queue moving: after responding, it queues hackathon projects that were
 * never queued and works through anything waiting. The Projects tab polls this while open.
 */

import { NextRequest, after } from "next/server";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { drainCodeReviewQueue, listCodeReviews, maybeQueueMissingCodeReviews } from "@/lib/code-review/queue";

/** Reviews run inside `after()`, which shares this route's time limit. */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { items, needsWork } = await listCodeReviews();

    after(async () => {
      try {
        const added = await maybeQueueMissingCodeReviews();
        if (needsWork || added > 0) await drainCodeReviewQueue();
      } catch (e) {
        logServerRouteException("code-review drain", e);
      }
    });

    return ok(items);
  } catch (e) {
    logServerRouteException("GET /api/admin/code-reviews", e);
    return err("Failed to fetch code reviews", 500);
  }
}
