/**
 * GET /api/admin/cohort-completion
 * Attendance + weekly labs + current-cohort projects (Admin SDK).
 */

import { NextRequest } from "next/server";
import { requireAdmin, ok, isErrorResponse } from "@/lib/api-helpers";
import {
  COMPLETION_FILTERS,
  buildFilteredCohortCompletionReport,
  type CompletionFilter,
} from "@/lib/server/cohortCompletion";
import { adminRouteError } from "@/lib/server/admin/http";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const q = req.nextUrl.searchParams;
    const filterRaw = q.get("filter") || "all";
    const filter = (COMPLETION_FILTERS as readonly string[]).includes(filterRaw)
      ? (filterRaw as CompletionFilter)
      : "all";
    const minRaw = q.get("minSessions");
    const minSessions = minRaw ? Number(minRaw) : undefined;

    return ok(
      await buildFilteredCohortCompletionReport({
        cohortId: q.get("cohortId") || undefined,
        minSessions: Number.isFinite(minSessions) ? minSessions : undefined,
        excludeCancelled: q.get("excludeCancelled") === "0" ? false : undefined,
        excludeUpcoming: q.get("excludeUpcoming") === "0" ? false : undefined,
        includeStaff: q.get("includeStaff") === "1",
        filter,
      })
    );
  } catch (e) {
    return adminRouteError(
      "GET /api/admin/cohort-completion",
      e,
      "Failed to build completion report"
    );
  }
}
