/**
 * GET  /api/projects  — list projects (admin: all; attendee: own)
 * POST /api/projects  — upsert caller's programme project (same doc as hackathon entry)
 *
 * Body: { title, description, techStack[], githubUrl?, demoUrl?, weekCompleted,
 *         teamName?, projectType?, openToMembers? }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { projectCreateSchema } from "@/lib/api/schemas/requestBodies";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { hackathonSubmissionsAllowed } from "@/lib/server/hackathonSettings";
import { upsertUserCohortProject } from "@/lib/server/programmeProjects";

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
    const { title, description, techStack, weekCompleted, githubUrl, demoUrl } =
      parsed.data;

    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.data();
    const cohortId = await resolveActiveCohortIdFromDb();

    const result = await upsertUserCohortProject({
      uid: auth.uid,
      userName: userData?.displayName ?? "",
      cohortId,
      // During the closing hackathon window, stamp the edition tag on the same doc.
      hackathonId: (await hackathonSubmissionsAllowed())
        ? DEVCAMP_HACKATHON_ID
        : undefined,
      title,
      description,
      techStack,
      githubUrl,
      demoUrl,
      weekCompleted,
      status: "submitted",
      ship: true,
    });

    const body = { id: result.id, ...result.data };
    return result.created ? created(body) : ok(body);
  } catch (e) {
    logServerRouteException("POST /api/projects", e);
    return err("Failed to submit project", 500);
  }
}
