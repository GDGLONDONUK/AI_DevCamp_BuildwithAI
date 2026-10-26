/**
 * GET/PUT /api/hackathon/my-project
 *
 * Same Firestore `projects` document as DevCamp final project (one per user per cohort).
 * Optional hackathon fields are stamped for the closing event only.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { DEVCAMP_HACKATHON_ID, hackathonSubmissionsOpen } from "@/lib/hackathon";
import { isHackathonEligible } from "@/lib/hackathon/access";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import {
  findUserCohortProject,
  toPublicProjectCard,
  upsertUserCohortProject,
} from "@/lib/server/programmeProjects";

const saveSchema = z.object({
  ship: z.boolean().optional().default(false),
  title: z.string().trim().min(1).max(200),
  teamName: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().min(1).max(20000),
  projectType: z.enum(["solo", "team"]).default("solo"),
  openToMembers: z.boolean().optional().default(false),
  techStack: z.array(z.string().max(120)).max(40).optional().default([]),
  githubUrl: z.string().max(2000).optional().default(""),
  demoUrl: z.string().max(2000).optional().default(""),
  screenshotUrls: z.array(z.string().max(2000)).max(5).optional().default([]),
  weekCompleted: z.coerce.number().int().min(1).max(52).optional().default(4),
});

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId = await resolveActiveCohortIdFromDb();
    const existing = await findUserCohortProject(auth.uid, cohortId);
    if (!existing) return ok({ project: null });
    return ok({
      project: {
        ...toPublicProjectCard(existing.id, existing),
        userId: auth.uid,
        weekCompleted: Number(existing.weekCompleted) || 4,
      },
    });
  } catch (e) {
    logServerRouteException("GET /api/hackathon/my-project", e);
    return err("Failed to load project", 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!hackathonSubmissionsOpen()) {
      return err("Submissions are closed for this hackathon", 403);
    }

    const parsed = await parseJsonBody(req, saveSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const userData = userSnap.data() || {};
    const live = await resolveActiveCohortIdFromDb();

    if (
      !isHackathonEligible(
        {
          cohortIds: userData.cohortIds,
          hackathonParticipant: userData.hackathonParticipant,
          role: userData.role,
        },
        live
      )
    ) {
      return err(
        "Join the hackathon first (or enrol in the active DevCamp cohort)",
        403
      );
    }

    if (body.ship && !body.githubUrl?.trim()) {
      return err("GitHub repository URL is required for final submission", 400);
    }

    const existing = await findUserCohortProject(auth.uid, live);
    // Keep submitted if already shipped; drafts stay draft until ship.
    const nextStatus: "draft" | "submitted" = body.ship
      ? "submitted"
      : existing?.status === "submitted"
        ? "submitted"
        : "draft";

    const result = await upsertUserCohortProject({
      uid: auth.uid,
      userName: userData.displayName || auth.email || "Builder",
      cohortId: live,
      hackathonId: DEVCAMP_HACKATHON_ID,
      title: body.title,
      description: body.description,
      techStack: body.techStack,
      githubUrl: body.githubUrl,
      demoUrl: body.demoUrl,
      screenshotUrls: body.screenshotUrls,
      weekCompleted: body.weekCompleted,
      teamName: body.teamName || body.title,
      projectType: body.projectType,
      openToMembers: body.openToMembers,
      status: nextStatus,
      ship: body.ship,
    });

    return ok({
      id: result.id,
      status: nextStatus,
      shipped: body.ship,
      project: toPublicProjectCard(result.id, result.data),
    });
  } catch (e) {
    logServerRouteException("PUT /api/hackathon/my-project", e);
    return err("Failed to save project", 500);
  }
}
