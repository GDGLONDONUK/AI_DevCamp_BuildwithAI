/**
 * GET  /api/learning-tasks — list tasks for the signed-in user (active cohort only)
 * POST /api/learning-tasks — create a task owned by the signed-in user
 *
 * Security: Both handlers require `Authorization: Bearer <Firebase ID token>` via `verifyAuth`.
 * GET runs `learningTasks.where("userId", "==", auth.uid)` — no cross-user reads.
 * Firestore security rules additionally restrict documents so clients cannot widen scope.
 */

import { NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { learningTaskCreateSchema } from "@/lib/api/schemas/requestBodies";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import {
  deriveSessionOrder,
  serializeLearningTaskDoc,
} from "@/lib/server/learningTasksFirestore";
import { resolveLearningTaskActor } from "@/lib/server/learningTaskActor";
import {
  learningItemBelongsToCohort,
  resolveLearningTasksCohortId,
} from "@/lib/learningTasksCohort";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId = resolveLearningTasksCohortId(
      request.nextUrl.searchParams.get("cohortId")
    );

    const snap = await adminDb()
      .collection("learningTasks")
      .where("userId", "==", auth.uid)
      .orderBy("sessionOrder", "asc")
      .orderBy("sortOrder", "asc")
      .get();

    const tasks = snap.docs
      .map((d) => serializeLearningTaskDoc(d))
      .filter((row) =>
        learningItemBelongsToCohort(
          {
            cohortId: typeof row.cohortId === "string" ? row.cohortId : null,
            sessionKey: typeof row.sessionKey === "string" ? row.sessionKey : null,
          },
          cohortId
        )
      );
    return ok(tasks);
  } catch (e) {
    logServerRouteException("GET /api/learning-tasks", e);
    return err("Failed to fetch tasks", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, learningTaskCreateSchema);
    if (!parsed.ok) return parsed.response;

    const body = parsed.data;
    const sessionOrder = deriveSessionOrder(body.sessionKey, body.sessionOrder);
    const sortOrder = body.sortOrder ?? Date.now();
    const cohortId = resolveLearningTasksCohortId(body.cohortId);

    const due =
      body.dueDate === null || body.dueDate === undefined
        ? null
        : Timestamp.fromDate(new Date(body.dueDate));

    const actor = await resolveLearningTaskActor(auth.uid, auth.email ?? null);

    const task = {
      userId: auth.uid,
      cohortId,
      title: body.title,
      sessionKey: body.sessionKey,
      sessionLabel: body.sessionLabel,
      sessionOrder,
      category: body.category,
      priority: body.priority,
      progress: body.progress,
      dueDate: due,
      notes: body.notes ?? "",
      sourceTemplateId: body.sourceTemplateId ?? null,
      sortOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdByUid: actor.uid,
      createdByLabel: actor.label,
      updatedByUid: actor.uid,
      updatedByLabel: actor.label,
    };

    const ref = await adminDb().collection("learningTasks").add(task);
    const createdSnap = await ref.get();
    return created(serializeLearningTaskDoc(createdSnap));
  } catch (e) {
    logServerRouteException("POST /api/learning-tasks", e);
    return err("Failed to create task", 500);
  }
}
