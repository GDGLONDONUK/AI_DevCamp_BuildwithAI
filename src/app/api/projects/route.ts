/**
 * GET  /api/projects  — list projects
 *   - Admin/moderator: all projects
 *   - Attendee: own projects only
 *
 * POST /api/projects  — submit a final project (authenticated users)
 *
 * POST body:
 *   { title, description, techStack[], githubUrl?, demoUrl?, weekCompleted }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { FieldValue } from "firebase-admin/firestore";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { projectCreateSchema } from "@/lib/api/schemas/requestBodies";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    let query = adminDb().collection("projects") as FirebaseFirestore.Query;

    if (!isAdmin) {
      query = query.where("userId", "==", auth.uid);
    }

    const snap = await query.orderBy("submittedAt", "desc").get();
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ok(projects);
  } catch (e) {
    logServerRouteException("GET /api/projects", e);
    return err("Failed to fetch projects", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, projectCreateSchema);
    if (!parsed.ok) return parsed.response;
    const { title, description, techStack, weekCompleted, githubUrl, demoUrl } = parsed.data;

    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.data();

    const project = {
      userId:        auth.uid,
      userEmail:     auth.email ?? "",
      userName:      userData?.displayName ?? "",
      title,
      description,
      techStack,
      githubUrl,
      demoUrl,
      weekCompleted,
      status:        "submitted",
      submittedAt:   FieldValue.serverTimestamp(),
    };

    const ref = await adminDb().collection("projects").add(project);
    return created({ id: ref.id, ...project });
  } catch (e) {
    logServerRouteException("POST /api/projects", e);
    return err("Failed to submit project", 500);
  }
}
