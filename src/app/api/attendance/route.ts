/**
 * GET /api/attendance — get attendance for all users (admin/moderator only)
 *
 * Returns a map: { [userId]: { [sessionId]: boolean } }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await adminDb().collection("attendance").get();
    const attendance: Record<string, Record<string, boolean>> = {};
    snap.docs.forEach((d) => {
      attendance[d.id] = d.data() as Record<string, boolean>;
    });
    return ok(attendance);
  } catch (e) {
    logServerRouteException("GET /api/attendance", e);
    return err("Failed to fetch attendance", 500);
  }
}
