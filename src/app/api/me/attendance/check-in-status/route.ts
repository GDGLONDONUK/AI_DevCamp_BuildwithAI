/**
 * GET /api/me/attendance/check-in-status?sessionId=session-2
 *
 * Returns whether live self check-in is currently open (no code exposed).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { SESSION_SELF_CHECKIN_COLLECTION } from "@/lib/sessionSelfCheckInConstants";
import { isSelfCheckInWindowOpen } from "@/lib/server/selfCheckInWindow";
import type { SessionSelfCheckInDocument } from "@/types";

function canSelfCheckInStatus(userStatus: unknown): boolean {
  return (
    userStatus === "participated" ||
    userStatus === "certified" ||
    userStatus === "not-certified"
  );
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim() ?? "";
  if (!sessionId) return err("sessionId query is required");

  try {
    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userStatus = userSnap.exists ? userSnap.data()?.userStatus : undefined;
    if (!canSelfCheckInStatus(userStatus)) {
      return ok({
        sessionId,
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
