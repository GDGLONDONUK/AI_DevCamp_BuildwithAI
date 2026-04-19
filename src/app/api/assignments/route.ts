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
import { ok, created, err, verifyAuth, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { FieldValue } from "firebase-admin/firestore";

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
    const assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ok(assignments);
  } catch (e) {
    console.error("GET /api/assignments", e);
    return err("Failed to fetch assignments", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { weekNumber, sessionId, title, description } = body;

    if (!weekNumber || !title || !description) {
      return err("weekNumber, title and description are required");
    }

    // Fetch user display name to denormalise into the document
    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.data();

    const assignment = {
      userId:      auth.uid,
      userEmail:   auth.email ?? "",
      userName:    userData?.displayName ?? "",
      weekNumber:  Number(weekNumber),
      sessionId:   sessionId ?? "",
      title,
      description,
      githubUrl:   body.githubUrl   ?? "",
      notebookUrl: body.notebookUrl ?? "",
      demoUrl:     body.demoUrl     ?? "",
      status:      "submitted",
      submittedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb().collection("assignments").add(assignment);
    return created({ id: ref.id, ...assignment });
  } catch (e) {
    console.error("POST /api/assignments", e);
    return err("Failed to submit assignment", 500);
  }
}
