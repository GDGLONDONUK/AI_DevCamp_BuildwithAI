/**
 * GET   /api/assignments/[id]  — get a single assignment (admin or owner)
 * PATCH /api/assignments/[id]  — update status or feedback (admin/moderator only)
 */

import { NextRequest } from "next/server";
import { ok, err, verifyAuth, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { assignmentAdminPatchSchema } from "@/lib/api/schemas/requestBodies";
import { getAssignment, updateAssignment } from "@/lib/server/admin/assignments";
import { adminRouteError } from "@/lib/server/admin/http";
import { omitContactPii } from "@/lib/server/omitContactPii";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const data = await getAssignment(id);
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin && data.userId !== auth.uid) return err("Forbidden", 403);
    return ok(
      isAdmin ? data : omitContactPii(data as Record<string, unknown>)
    );
  } catch (e) {
    return adminRouteError(`GET /api/assignments/${id}`, e, "Failed to fetch assignment");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, assignmentAdminPatchSchema);
    if (!parsed.ok) return parsed.response;
    return ok(await updateAssignment(id, parsed.data));
  } catch (e) {
    return adminRouteError(`PATCH /api/assignments/${id}`, e, "Failed to update assignment");
  }
}
