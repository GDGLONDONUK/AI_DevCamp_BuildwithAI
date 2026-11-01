/**
 * GET  /api/admin/cohorts/close?cohortId= — preview who qualifies
 * POST /api/admin/cohorts/close { cohortId, confirm: true } — apply (idempotent)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";
import { applyCloseCohort, previewCloseCohort } from "@/lib/server/closeCohort";
import { adminRouteError } from "@/lib/server/admin/http";

const bodySchema = z
  .object({
    cohortId: z.string().min(1).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;
  const cohortId =
    req.nextUrl.searchParams.get("cohortId")?.trim() || SEPTEMBER_2026_COHORT_ID;
  try {
    const preview = await previewCloseCohort(cohortId);
    return ok({
      ...preview,
      qualifyingCount: preview.qualifying.length,
      oneSessionShortCount: preview.oneSessionShort.length,
    });
  } catch (e) {
    return adminRouteError("GET /api/admin/cohorts/close", e, "Failed to preview close");
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;
  try {
    const parsed = await parseJsonBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;
    if (parsed.data.confirm !== true) {
      return err("Pass confirm: true after reviewing the preview", 400);
    }
    const cohortId = parsed.data.cohortId?.trim() || SEPTEMBER_2026_COHORT_ID;
    const result = await applyCloseCohort({ cohortId, actorUid: auth.uid });
    return ok({
      ...result,
      qualifyingCount: result.qualifying.length,
      oneSessionShortCount: result.oneSessionShort.length,
    });
  } catch (e) {
    return adminRouteError("POST /api/admin/cohorts/close", e, "Failed to close cohort");
  }
}
