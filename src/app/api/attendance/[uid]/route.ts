/**
 * GET   /api/attendance/[uid]  — get attendance record for one user (admin or self)
 * PATCH /api/attendance/[uid]  — toggle a session's attendance (admin/moderator only)
 *
 * PATCH body:
 *   { sessionId: string, attended: boolean, force?: boolean }
 */

import { NextRequest } from "next/server";
import { ok, err, verifyAuth, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { attendanceAdminPatchSchema } from "@/lib/api/schemas/requestBodies";
import { getAdminAttendance, setAdminAttendance } from "@/lib/server/admin/attendance";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";
import { adminRouteError } from "@/lib/server/admin/http";

type Params = { params: Promise<{ uid: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const raw = decodeURIComponent((await params).uid);
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const user = await resolveUserDoc(raw);
    const uid = user?.id || raw;
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin && auth.uid !== uid) return err("Forbidden", 403);
    const result = await getAdminAttendance(uid);
    return ok(result.attendance);
  } catch (e) {
    return adminRouteError(`GET /api/attendance/${raw}`, e, "Failed to fetch attendance");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const raw = decodeURIComponent((await params).uid);
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, attendanceAdminPatchSchema);
    if (!parsed.ok) return parsed.response;
    const result = await setAdminAttendance({
      uidOrEmail: raw,
      sessionId: parsed.data.sessionId,
      attended: parsed.data.attended,
      actorUid: auth.uid,
      force: parsed.data.force,
    });
    return ok(result.attendance);
  } catch (e) {
    return adminRouteError(`PATCH /api/attendance/${raw}`, e, "Failed to update attendance");
  }
}
