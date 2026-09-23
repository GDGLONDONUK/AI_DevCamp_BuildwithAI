/**
 * GET /api/me/attendance/check-in-status?sessionId=sept-2026-kickoff
 *
 * Returns whether live self check-in is currently open for that session (no code exposed).
 * Gated by user status + enrolment in the session's cohort.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { SESSION_SELF_CHECKIN_COLLECTION } from "@/lib/sessionSelfCheckInConstants";
import { canSelfCheckInStatus } from "@/lib/server/selfCheckInEligibility";
import {
  canSelfCheckInForSessionCohort,
  sessionCohortId,
} from "@/lib/server/sessionCohortAccess";
import { isSelfCheckInWindowOpen } from "@/lib/server/selfCheckInWindow";
import type { SessionSelfCheckInDocument } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim() ?? "";
  if (!sessionId) return err("sessionId query is required");

  try {
    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.exists ? userSnap.data() : undefined;
    const userStatus = userData?.userStatus;

    if (!canSelfCheckInStatus(userStatus)) {
      return ok({
        sessionId,
        cohortId: null,
        eligible: false,
        active: false,
        opensAt: null,
        closesAt: null,
      });
    }

    const sessionSnap = await adminDb().collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return ok({
        sessionId,
        cohortId: null,
        eligible: false,
        active: false,
        opensAt: null,
        closesAt: null,
      });
    }

    const cohortId = sessionCohortId(sessionSnap.data());
    if (!canSelfCheckInForSessionCohort(userData, cohortId)) {
      return ok({
        sessionId,
        cohortId,
        eligible: false,
        active: false,
        opensAt: null,
        closesAt: null,
      });
    }

    const cfgSnap = await adminDb().collection(SESSION_SELF_CHECKIN_COLLECTION).doc(sessionId).get();
    const cfg = cfgSnap.exists
      ? ({ ...cfgSnap.data() } as SessionSelfCheckInDocument)
      : undefined;

    const active = isSelfCheckInWindowOpen(cfg);

    return ok({
      sessionId,
      cohortId,
      eligible: true,
      active,
      opensAt: cfg?.opensAt ?? null,
      closesAt: cfg?.closesAt ?? null,
    });
  } catch (e) {
    logServerRouteException("GET /api/me/attendance/check-in-status", e);
    return err("Failed to load check-in status", 500);
  }
}
