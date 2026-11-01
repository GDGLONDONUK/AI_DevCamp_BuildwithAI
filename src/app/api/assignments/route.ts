/**
 * GET  /api/assignments  — list assignments
 *   - Admin/moderator: all assignments
 *   - Attendee: own assignments only
 *
 * POST /api/assignments  — submit a new assignment (authenticated users)
 *
 * POST body:
 *   { weekNumber, sessionId, title, description, githubUrl?, notebookUrl?, demoUrl? }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { FieldValue } from "firebase-admin/firestore";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { assignmentCreateSchema } from "@/lib/api/schemas/requestBodies";
import { omitContactPii, publicDisplayName } from "@/lib/server/omitContactPii";
import { sessionCohortId } from "@/lib/server/sessionCohortAccess";
import { assertCohortAcceptsSubmissions } from "@/lib/server/cohortLifecycle";
import { isAdminOpError } from "@/lib/server/admin/errors";
import { assertSafeProjectSubmitUrl } from "@/lib/safeProjectUrl";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    let query = adminDb().collection("assignments") as FirebaseFirestore.Query;

    if (!isAdmin) {
      // Attendees only see their own submissions
      query = query.where("userId", "==", auth.uid);
    }

    const snap = await query.orderBy("submittedAt", "desc").get();
    const assignments = snap.docs.map((d) => {
      const row = { id: d.id, ...d.data() } as Record<string, unknown>;
      return isAdmin ? row : omitContactPii(row);
    });
    return ok(assignments);
  } catch (e) {
    logServerRouteException("GET /api/assignments", e);
    return err("Failed to fetch assignments", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, assignmentCreateSchema);
    if (!parsed.ok) return parsed.response;
    const { weekNumber, sessionId, title, description, githubUrl, notebookUrl, demoUrl } =
      parsed.data;

    try {
      if (githubUrl) assertSafeProjectSubmitUrl(githubUrl, "githubUrl");
      if (notebookUrl) assertSafeProjectSubmitUrl(notebookUrl, "notebookUrl");
      if (demoUrl) assertSafeProjectSubmitUrl(demoUrl, "demoUrl");
    } catch (e) {
      return err(e instanceof Error ? e.message : "Invalid URL", 400);
    }

    const sessionSnap = await adminDb().collection("sessions").doc(sessionId).get();
    const cohortId = sessionCohortId(sessionSnap.exists ? sessionSnap.data() : undefined);
    try {
      await assertCohortAcceptsSubmissions(cohortId);
    } catch (gate) {
      if (isAdminOpError(gate)) return err(gate.message, gate.status);
      throw gate;
    }

    // Fetch user display name to denormalise into the document
    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.data();

    const assignment = {
      userId:      auth.uid,
      userName:    publicDisplayName(userData?.displayName),
      weekNumber,
      sessionId,
      title,
      description,
      githubUrl,
      notebookUrl,
      demoUrl,
      status:      "submitted",
      submittedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb().collection("assignments").add(assignment);
    return created({ id: ref.id, ...assignment });
  } catch (e) {
    logServerRouteException("POST /api/assignments", e);
    return err("Failed to submit assignment", 500);
  }
}
