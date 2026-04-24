/**
 * POST /api/me/attendance/self-check-in
 *
 * Marks `attendance/{uid}` for a session when the live window is open and the code matches.
 * Body: { sessionId: string, code: string }
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { attendancePatchWithAudit } from "@/lib/attendanceAudit";
import {
  SESSION_SELF_CHECKIN_COLLECTION,
} from "@/lib/sessionSelfCheckInConstants";
import { normalizeAttendanceCode } from "@/lib/server/selfCheckInCode";
import {
  isSelfCheckInRateLimited,
  recordSelfCheckInFailure,
} from "@/lib/server/selfCheckInRateLimit";
import { isSelfCheckInWindowOpen } from "@/lib/server/selfCheckInWindow";
import type { SessionSelfCheckInDocument } from "@/types";

function canSelfCheckInStatus(userStatus: unknown): boolean {
  return (
    userStatus === "participated" ||
    userStatus === "certified" ||
    userStatus === "not-certified"
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const codeRaw = typeof body.code === "string" ? body.code : "";

    if (!sessionId) return err("sessionId is required");
    if (!codeRaw.trim()) return err("code is required");

    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userStatus = userSnap.exists ? userSnap.data()?.userStatus : undefined;
    if (!canSelfCheckInStatus(userStatus)) {
      return err("Your account is not eligible for self check-in yet.", 403);
    }

    const sessionSnap = await adminDb().collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) return err("Session not found", 404);

    if (isSelfCheckInRateLimited(auth.uid)) {
      return err("Too many attempts. Try again in a few minutes.", 429);
    }

    const cfgSnap = await adminDb().collection(SESSION_SELF_CHECKIN_COLLECTION).doc(sessionId).get();
    const cfg = cfgSnap.exists
      ? (cfgSnap.data() as SessionSelfCheckInDocument)
      : undefined;

    if (!isSelfCheckInWindowOpen(cfg)) {
      return err("Check-in is not open for this session right now.", 400);
    }

    const normalizedInput = normalizeAttendanceCode(codeRaw);
    const normalizedStored = normalizeAttendanceCode(cfg!.code);
    if (normalizedInput !== normalizedStored) {
      recordSelfCheckInFailure(auth.uid);
      return err("Invalid check-in code.", 400);
    }

    const ref = adminDb().collection("attendance").doc(auth.uid);
    const attSnap = await ref.get();
    const existingData = attSnap.exists ? (attSnap.data() as Record<string, unknown>) : undefined;

    if (existingData?.[sessionId] === true) {
      return ok({ sessionId, alreadyMarked: true });
    }

    await ref.set(
      {
        ...attendancePatchWithAudit(sessionId, true, auth.uid, "self_check_in", existingData),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({ sessionId, marked: true });
  } catch (e) {
    logServerRouteException("POST /api/me/attendance/self-check-in", e);
    return err("Check-in failed", 500);
  }
}
