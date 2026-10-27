/**
 * GET  /api/projects/[id]/code-review  — the code review for one project (admin/moderator only)
 * POST /api/projects/[id]/code-review  — "Review again" (admin/moderator only)
 *
 * POST body:
 *   { force?: boolean }
 *
 * Reviews are written by the background agent (`functions/`), never by this route: POST only
 * marks the review as queued, and the agent picks it up within seconds.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { projectCodeReviewRequestSchema } from "@/lib/api/schemas/requestBodies";
import { enqueueCodeReview, getCodeReview } from "@/lib/code-review/queue";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    return ok(await getCodeReview(adminDb(), id));
  } catch (e) {
    logServerRouteException(`GET /api/projects/${id}/code-review`, e);
    return err("Failed to fetch code review", 500);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, projectCodeReviewRequestSchema);
    if (!parsed.ok) return parsed.response;

    const status = await enqueueCodeReview(adminDb(), id, { force: parsed.data.force !== false });
    if (status === "no-project") return err("Project not found", 404);
    return ok({ status });
  } catch (e) {
    logServerRouteException(`POST /api/projects/${id}/code-review`, e);
    return err("Failed to queue code review", 500);
  }
}
