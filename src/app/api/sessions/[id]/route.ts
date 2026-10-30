/**
 * GET    /api/sessions/[id]  — get single session (public)
 * PUT    /api/sessions/[id]  — update session (admin/moderator only)
 * DELETE /api/sessions/[id]  — delete session (admin only)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { upsertSession } from "@/lib/server/admin/sessions";
import { adminRouteError } from "@/lib/server/admin/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const snap = await adminDb().collection("sessions").doc(id).get();
    if (!snap.exists) return err("Session not found", 404);
    return ok({ id: snap.id, ...snap.data() });
  } catch (e) {
    logServerRouteException(`GET /api/sessions/${id}`, e);
    return err("Failed to fetch session", 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return err("Invalid JSON body", 400);
    const { id: _ignored, merge, ...fields } = body;
    return ok(await upsertSession({ id, fields, merge: merge !== false }));
  } catch (e) {
    return adminRouteError(`PUT /api/sessions/${id}`, e, "Failed to update session");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    await adminDb().collection("sessions").doc(id).delete();
    return ok({ deleted: id });
  } catch (e) {
    logServerRouteException(`DELETE /api/sessions/${id}`, e);
    return err("Failed to delete session", 500);
  }
}
