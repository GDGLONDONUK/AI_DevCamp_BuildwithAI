/**
 * POST /api/admin/learning-task-templates/seed — upsert programme checklists (idempotent).
 * Writes spring (inactive) + September (active) rows with cohortId + material notes/URLs.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { LEARNING_TASK_TEMPLATES_SEED } from "@/data/learningTaskTemplatesSeed";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function POST(_request: NextRequest) {
  const auth = await requireAdmin(_request);
  if (isErrorResponse(auth)) return auth;

  try {
    const db = adminDb();
    const now = FieldValue.serverTimestamp();
    let written = 0;

    let batch = db.batch();
    let batchCount = 0;

    const flush = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };

    for (const row of LEARNING_TASK_TEMPLATES_SEED) {
      const ref = db.collection("learningTaskTemplates").doc(row.id);
      batch.set(
        ref,
        {
          cohortId: row.cohortId,
          sessionKey: row.sessionKey,
          sessionLabel: row.sessionLabel,
          sessionOrder: row.sessionOrder,
          title: row.title,
          category: row.category,
          sortOrder: row.sortOrder,
          notes: row.notes ?? "",
          active: row.active !== false,
          updatedByUid: auth.uid,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );
      batchCount++;
      written++;
      if (batchCount >= 400) await flush();
    }

    await flush();
    return ok({ written });
  } catch (e) {
    logServerRouteException("POST /api/admin/learning-task-templates/seed", e);
    return err("Failed to seed templates", 500);
  }
}
