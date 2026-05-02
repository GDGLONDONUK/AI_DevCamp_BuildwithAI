/**
 * POST /api/learning-task-templates/import — copy catalogue rows into the user's private tasks.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { learningTaskImportSchema } from "@/lib/api/schemas/requestBodies";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { resolveLearningTaskActor } from "@/lib/server/learningTaskActor";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, learningTaskImportSchema);
    if (!parsed.ok) return parsed.response;

    const db = adminDb();
    const actor = await resolveLearningTaskActor(auth.uid, auth.email ?? null);

    let templateDocs: DocumentSnapshot[] = [];

    const ids = parsed.data.templateIds?.filter(Boolean) ?? [];
    if (ids.length > 0) {
      const refs = ids.map((id) => db.collection("learningTaskTemplates").doc(id));
      templateDocs = (await db.getAll(...refs)).filter((s) => s.exists);
    } else if (parsed.data.importAllActive) {
      const snap = await db.collection("learningTaskTemplates").get();
      templateDocs = snap.docs.filter((d) => d.data()?.active !== false);
    }

    const existingSnap = await db.collection("learningTasks").where("userId", "==", auth.uid).get();
    const existingTemplateIds = new Set(
      existingSnap.docs
        .map((d) => d.data()?.sourceTemplateId as string | undefined)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );

    let imported = 0;
    let skipped = 0;

    let batch = db.batch();
    let batchCount = 0;

    const commitBatch = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };

    for (const docSnap of templateDocs) {
      const id = docSnap.id;
      if (existingTemplateIds.has(id)) {
        skipped++;
        continue;
      }
      const td = docSnap.data();
      if (!td || td.active === false) {
        skipped++;
        continue;
      }

      const ref = db.collection("learningTasks").doc();
      batch.set(ref, {
        userId: auth.uid,
        title: td.title,
        sessionKey: td.sessionKey,
        sessionLabel: td.sessionLabel,
        sessionOrder: td.sessionOrder ?? 999,
        category: td.category ?? "other",
        priority: "medium",
        progress: "not_started",
        dueDate: null,
        notes: "",
        sourceTemplateId: id,
        sortOrder: td.sortOrder ?? Date.now(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdByUid: actor.uid,
        createdByLabel: actor.label,
        updatedByUid: actor.uid,
        updatedByLabel: actor.label,
      });
      batchCount++;
      imported++;
      existingTemplateIds.add(id);

      if (batchCount >= 400) await commitBatch();
    }

    await commitBatch();

    return ok({ imported, skipped });
  } catch (e) {
    logServerRouteException("POST /api/learning-task-templates/import", e);
    return err("Failed to import templates", 500);
  }
}
