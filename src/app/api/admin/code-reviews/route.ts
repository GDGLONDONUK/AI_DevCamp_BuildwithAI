/**
 * GET /api/admin/code-reviews  — review status for every project, for the Projects tab (admin/moderator only)
 *
 * Read-only. Reviews are written by the background agent (`functions/`).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { listCodeReviews } from "@/lib/code-review/queue";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    return ok(await listCodeReviews(adminDb()));
  } catch (e) {
    logServerRouteException("GET /api/admin/code-reviews", e);
    return err("Failed to fetch code reviews", 500);
  }
}
