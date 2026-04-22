/**
 * GET   /api/attendance/[uid]  — get attendance record for one user (admin or self)
 * PATCH /api/attendance/[uid]  — toggle a session's attendance (admin/moderator only)
 *
 * PATCH body:
 *   { sessionId: string, attended: boolean }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, requireAdminOrSelf, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Params = { params: Promise<{ uid: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { uid } = await params;

  const auth = await requireAdminOrSelf(request, uid);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await adminDb().collection("attendance").doc(uid).get();
    return ok(snap.exists ? snap.data() : {});
  } catch (e) {
    logServerRouteException(`GET /api/attendance/${uid}`, e);
    return err("Failed to fetch attendance", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { uid } = await params;

  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { sessionId, attended } = await request.json();

    if (!sessionId) return err("sessionId is required");
    if (typeof attended !== "boolean") return err("attended must be a boolean");

    await adminDb().collection("attendance").doc(uid).set(
      { [sessionId]: attended },
      { merge: true }
    );

    const updated = await adminDb().collection("attendance").doc(uid).get();
    return ok(updated.data() ?? {});
  } catch (e) {
    logServerRouteException(`PATCH /api/attendance/${uid}`, e);
    return err("Failed to update attendance", 500);
  }
}
