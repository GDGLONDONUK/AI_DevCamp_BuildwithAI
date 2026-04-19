/**
 * GET    /api/sessions/[id]  — get single session (public)
 * PUT    /api/sessions/[id]  — update session (admin/moderator only)
 * DELETE /api/sessions/[id]  — delete session (admin only)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const snap = await adminDb().collection("sessions").doc(id).get();
    if (!snap.exists) return err("Session not found", 404);
    return ok({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error(`GET /api/sessions/${id}`, e);
    return err("Failed to fetch session", 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const updatedAt = new Date().toISOString();
    await adminDb().collection("sessions").doc(id).set(
      { ...body, id, updatedAt },
      { merge: true }
    );
    const updated = await adminDb().collection("sessions").doc(id).get();
    return ok({ id: updated.id, ...updated.data() });
  } catch (e) {
    console.error(`PUT /api/sessions/${id}`, e);
    return err("Failed to update session", 500);
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
    console.error(`DELETE /api/sessions/${id}`, e);
    return err("Failed to delete session", 500);
  }
}
