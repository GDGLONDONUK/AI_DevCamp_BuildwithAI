/**
 * GET   /api/projects/[id]  — get a single project (admin or owner)
 * PATCH /api/projects/[id]  — update status or feedback (admin/moderator only)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { projectAdminPatchSchema } from "@/lib/api/schemas/requestBodies";
import { patchAdminProject } from "@/lib/server/hackathonOps";
import { adminRouteError } from "@/lib/server/admin/http";
import { omitContactPii } from "@/lib/server/omitContactPii";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await adminDb().collection("projects").doc(id).get();
    if (!snap.exists) return err("Project not found", 404);
    const data = snap.data()!;
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin && data.userId !== auth.uid) return err("Forbidden", 403);
    const row = { id: snap.id, ...data } as Record<string, unknown>;
    return ok(isAdmin ? row : omitContactPii(row));
  } catch (e) {
    logServerRouteException(`GET /api/projects/${id}`, e);
    return err("Failed to fetch project", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, projectAdminPatchSchema);
    if (!parsed.ok) return parsed.response;
    const project = await patchAdminProject(id, {
      status: parsed.data.status,
      feedback: parsed.data.feedback,
    });
    return ok(project);
  } catch (e) {
    return adminRouteError(`PATCH /api/projects/${id}`, e, "Failed to update project");
  }
}
