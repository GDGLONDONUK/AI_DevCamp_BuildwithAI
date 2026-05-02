/**
 * GET    /api/admin/learning-task-templates — list all templates (including inactive)
 * POST   /api/admin/learning-task-templates — create a template (admin / moderator)
 * DELETE /api/admin/learning-task-templates — delete every template doc (**admin only**)
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { learningTaskTemplateAdminCreateSchema } from "@/lib/api/schemas/requestBodies";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { serializeLearningTemplateDoc } from "@/lib/server/learningTasksFirestore";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await adminDb().collection("learningTaskTemplates").get();
    const rows = snap.docs
      .map((d) => serializeLearningTemplateDoc(d))
      .sort((a, b) => {
        const sa = Number(a.sessionOrder ?? 0);
        const sb = Number(b.sessionOrder ?? 0);
        if (sa !== sb) return sa - sb;
        return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
      });
    return ok(rows);
  } catch (e) {
    logServerRouteException("GET /api/admin/learning-task-templates", e);
    return err("Failed to fetch templates", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, learningTaskTemplateAdminCreateSchema);
    if (!parsed.ok) return parsed.response;

    const db = adminDb();
    const now = FieldValue.serverTimestamp();
    const fields = {
      sessionKey: parsed.data.sessionKey,
      sessionLabel: parsed.data.sessionLabel,
      sessionOrder: parsed.data.sessionOrder,
      title: parsed.data.title,
      category: parsed.data.category,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
      updatedByUid: auth.uid,
      updatedAt: now,
    };

    if (parsed.data.id) {
      const ref = db.collection("learningTaskTemplates").doc(parsed.data.id);
      const existing = await ref.get();
      await ref.set(
        {
          ...fields,
          createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
        },
        { merge: true }
      );
      const createdSnap = await ref.get();
      return created(serializeLearningTemplateDoc(createdSnap));
    }

    const ref = await db.collection("learningTaskTemplates").add({
      ...fields,
      createdAt: now,
    });
    const createdSnap = await ref.get();
    return created(serializeLearningTemplateDoc(createdSnap));
  } catch (e) {
    logServerRouteException("POST /api/admin/learning-task-templates", e);
    return err("Failed to create template", 500);
  }
}

/** Removes all catalogue rows. Does not touch attendee `learningTasks`. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Only admins may clear the entire template catalogue", 403);
  }

  try {
    const db = adminDb();
    const col = db.collection("learningTaskTemplates");
    const snap = await col.get();
    const docs = snap.docs;
    const chunkSize = 450;

    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + chunkSize)) {
        batch.delete(doc.ref);
      }
      await batch.commit();
    }

    return ok({ deleted: docs.length });
  } catch (e) {
    logServerRouteException("DELETE /api/admin/learning-task-templates", e);
    return err("Failed to clear templates", 500);
  }
}
