/**
 * GET /api/learning-task-templates — suggested checklist rows (active + active cohort).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { serializeLearningTemplateDoc } from "@/lib/server/learningTasksFirestore";
import {
  learningItemBelongsToCohort,
  resolveLearningTasksCohortId,
} from "@/lib/learningTasksCohort";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId = resolveLearningTasksCohortId(
      request.nextUrl.searchParams.get("cohortId")
    );

    const snap = await adminDb().collection("learningTaskTemplates").get();
    const rows = snap.docs
      .map((d) => serializeLearningTemplateDoc(d))
      .filter((row) => row.active !== false)
      .filter((row) =>
        learningItemBelongsToCohort(
          {
            cohortId: typeof row.cohortId === "string" ? row.cohortId : null,
            sessionKey: typeof row.sessionKey === "string" ? row.sessionKey : null,
          },
          cohortId
        )
      )
      .sort((a, b) => {
        const sa = Number(a.sessionOrder ?? 0);
        const sb = Number(b.sessionOrder ?? 0);
        if (sa !== sb) return sa - sb;
        return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
      });
    return ok(rows);
  } catch (e) {
    logServerRouteException("GET /api/learning-task-templates", e);
    return err("Failed to fetch templates", 500);
  }
}
