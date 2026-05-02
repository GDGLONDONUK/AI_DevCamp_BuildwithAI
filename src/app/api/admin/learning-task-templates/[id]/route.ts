/**
 * PATCH  /api/admin/learning-task-templates/[id]
 * DELETE /api/admin/learning-task-templates/[id]
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { learningTaskTemplatePatchSchema } from "@/lib/api/schemas/requestBodies";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { serializeLearningTemplateDoc } from "@/lib/server/learningTasksFirestore";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const parsed = await parseJsonBody(request, learningTaskTemplatePatchSchema);
    if (!parsed.ok) return parsed.response;

    const ref = adminDb().collection("learningTaskTemplates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return err("Not found", 404);

    const patch = parsed.data;
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: auth.uid,
    };

    if (patch.sessionKey !== undefined) update.sessionKey = patch.sessionKey;
    if (patch.sessionLabel !== undefined) update.sessionLabel = patch.sessionLabel;
    if (patch.sessionOrder !== undefined) update.sessionOrder = patch.sessionOrder;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.sortOrder !== undefined) update.sortOrder = patch.sortOrder;
    if (patch.active !== undefined) update.active = patch.active;

    await ref.update(update);
    const next = await ref.get();
    return ok(serializeLearningTemplateDoc(next));
  } catch (e) {
    logServerRouteException(`PATCH /api/admin/learning-task-templates/${id}`, e);
    return err("Failed to update template", 500);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const ref = adminDb().collection("learningTaskTemplates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return err("Not found", 404);
    await ref.delete();
    return ok({ id });
  } catch (e) {
    logServerRouteException(`DELETE /api/admin/learning-task-templates/${id}`, e);
    return err("Failed to delete template", 500);
  }
}
