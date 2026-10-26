/**
 * GET  /api/projects/[id]/code-review  — the code review for one project (admin/moderator only)
 * POST /api/projects/[id]/code-review  — queue a review
 *   - Owner: queues the first review after submitting a hackathon project (no-op if one exists)
 *   - Admin/moderator: "Review again" (body { force: true })
 *
 * POST body:
 *   { force?: boolean }
 *
 * The review runs after the response is sent (`after()`), so callers never wait for it.
 */

import { NextRequest, after } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { projectCodeReviewRequestSchema } from "@/lib/api/schemas/requestBodies";
import { drainCodeReviewQueue, enqueueCodeReview, getCodeReview } from "@/lib/code-review/queue";
import { getEventWindow } from "@/lib/code-review/config";

/** Reviews run inside `after()`, which shares this route's time limit. */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const review = await getCodeReview(id);
    if (review && review.status === "queued") {
      after(() => drainCodeReviewQueue().catch((e) => logServerRouteException("code-review drain", e)));
    }
    return ok(review);
  } catch (e) {
    logServerRouteException(`GET /api/projects/${id}/code-review`, e);
    return err("Failed to fetch code review", 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, projectCodeReviewRequestSchema);
    if (!parsed.ok) return parsed.response;

    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin) {
      const project = await adminDb().collection("projects").doc(id).get();
      if (!project.exists) return err("Project not found", 404);
      if (project.data()?.userId !== auth.uid) return err("Forbidden", 403);

      // Teams can only trigger reviews for hackathon-day submissions, so the review
      // quota can't be spent on old or throwaway projects. Admins can review anything.
      const submittedAt = project.data()?.submittedAt?.toDate?.() as Date | undefined;
      const earliest = getEventWindow().start.getTime() - 12 * 3_600_000;
      if (!submittedAt || submittedAt.getTime() < earliest) return ok({ received: true });
    }

    const status = await enqueueCodeReview(id, { force: isAdmin && parsed.data.force === true });
    if (status === "no-project") return err("Project not found", 404);

    after(() => drainCodeReviewQueue().catch((e) => logServerRouteException("code-review drain", e)));

    // Owners only learn that it was received — review contents are for judges.
    return ok(isAdmin ? { status } : { received: true });
  } catch (e) {
    logServerRouteException(`POST /api/projects/${id}/code-review`, e);
    return err("Failed to queue code review", 500);
  }
}
