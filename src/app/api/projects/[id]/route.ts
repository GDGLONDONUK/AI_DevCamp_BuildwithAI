/**
 * GET   /api/projects/[id]  — get a single project (admin or owner)
 * PATCH /api/projects/[id]  — update status or feedback (admin/moderator only)
 *
 * PATCH body:
 *   { status: "submitted" | "reviewed" | "shortlisted" | "winner", feedback?: string }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, requireAdmin } from "@/lib/api-helpers";
import { FieldValue } from "firebase-admin/firestore";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["submitted", "reviewed", "shortlisted", "winner"];

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await verifyAuth(request);
  if ("status" in auth && typeof auth.status === "number") return auth;

  try {
    const snap = await adminDb().collection("projects").doc(id).get();
    if (!snap.exists) return err("Project not found", 404);

    const data = snap.data()!;
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin && data.userId !== auth.uid) return err("Forbidden", 403);

    return ok({ id: snap.id, ...data });
  } catch (e) {
    console.error(`GET /api/projects/${id}`, e);
    return err("Failed to fetch project", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await requireAdmin(request);
  if ("status" in auth && typeof auth.status === "number") return auth;

  try {
    const { status, feedback } = await request.json();

    if (status && !VALID_STATUSES.includes(status)) {
      return err(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (status)   update.status   = status;
    if (feedback !== undefined) update.feedback = feedback;

    await adminDb().collection("projects").doc(id).update(update);
    const updated = await adminDb().collection("projects").doc(id).get();
    return ok({ id: updated.id, ...updated.data() });
  } catch (e) {
    console.error(`PATCH /api/projects/${id}`, e);
    return err("Failed to update project", 500);
  }
}
