/**
 * POST /api/admin/certifier/issue-cohort
 * Body: { cohortId?, dryRun?: true }
 * Default dryRun=true — never issues unless dryRun is explicitly false.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, ok, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { bulkIssueCohortCertificates } from "@/lib/server/admin/certifierOps";
import { adminRouteError } from "@/lib/server/admin/http";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";

const bodySchema = z
  .object({
    cohortId: z.string().min(1).optional(),
    dryRun: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;
  try {
    const parsed = await parseJsonBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;
    const dryRun = parsed.data.dryRun !== false;
    const result = await bulkIssueCohortCertificates({
      cohortId: parsed.data.cohortId || SEPTEMBER_2026_COHORT_ID,
      actorUid: auth.uid,
      dryRun,
    });
    return ok(result);
  } catch (e) {
    return adminRouteError(
      "POST /api/admin/certifier/issue-cohort",
      e,
      "Failed to issue cohort certificates"
    );
  }
}
