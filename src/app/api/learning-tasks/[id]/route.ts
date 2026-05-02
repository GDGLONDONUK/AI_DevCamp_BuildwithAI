/**
 * GET    /api/learning-tasks/[id]
 * PATCH  /api/learning-tasks/[id]
 * DELETE /api/learning-tasks/[id]
 */

import { NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { learningTaskPatchSchema } from "@/lib/api/schemas/requestBodies";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import {
  deriveSessionOrder,
  serializeLearningTaskDoc,
} from "@/lib/server/learningTasksFirestore";
import { resolveLearningTaskActor } from "@/lib/server/learningTaskActor";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const ref = adminDb().collection("learningTasks").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return err("Not found", 404);
    const data = snap.data();
    if (data?.userId !== auth.uid) return err("Forbidden", 403);
    return ok(serializeLearningTaskDoc(snap));
  } catch (e) {
    logServerRouteException(`GET /api/learning-tasks/${id}`, e);
    return err("Failed to fetch task", 500);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const parsed = await parseJsonBody(request, learningTaskPatchSchema);
    if (!parsed.ok) return parsed.response;

    const ref = adminDb().collection("learningTasks").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return err("Not found", 404);
    const data = snap.data();
    if (data?.userId !== auth.uid) return err("Forbidden", 403);

    const patch = parsed.data;
    const actor = await resolveLearningTaskActor(auth.uid, auth.email ?? null);
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: actor.uid,
      updatedByLabel: actor.label,
    };

    if (patch.title !== undefined) update.title = patch.title;
    if (patch.sessionKey !== undefined) update.sessionKey = patch.sessionKey;
    if (patch.sessionLabel !== undefined) update.sessionLabel = patch.sessionLabel;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.priority !== undefined) update.priority = patch.priority;
    if (patch.progress !== undefined) update.progress = patch.progress;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.sortOrder !== undefined) update.sortOrder = patch.sortOrder;

    if (patch.sessionOrder !== undefined || patch.sessionKey !== undefined) {
      const sk = (patch.sessionKey ?? data.sessionKey) as string;
      update.sessionOrder =
        patch.sessionOrder !== undefined ? patch.sessionOrder : deriveSessionOrder(sk);
    }

    if (patch.dueDate !== undefined) {
      update.dueDate =
        patch.dueDate === null ? null : Timestamp.fromDate(new Date(patch.dueDate));
    }

    await ref.update(update);
    const next = await ref.get();
    return ok(serializeLearningTaskDoc(next));
  } catch (e) {
    logServerRouteException(`PATCH /api/learning-tasks/${id}`, e);
    return err("Failed to update task", 500);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const ref = adminDb().collection("learningTasks").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return err("Not found", 404);
    if (snap.data()?.userId !== auth.uid) return err("Forbidden", 403);
    await ref.delete();
    return ok({ id });
  } catch (e) {
    logServerRouteException(`DELETE /api/learning-tasks/${id}`, e);
    return err("Failed to delete task", 500);
  }
}
