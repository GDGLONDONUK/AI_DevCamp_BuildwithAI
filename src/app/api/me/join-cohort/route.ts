/**
 * POST /api/me/join-cohort
 * Join the active (or specified) cohort. Existing spring alumni must call this
 * to participate in September 2026 — they are not auto-enrolled.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { userInCohort } from "@/lib/cohorts";
import { isRegistrationOpen } from "@/lib/registrationOpen";
import {
  getCohortLifecycle,
  resolveEnrolmentCohortId,
} from "@/lib/server/cohortLifecycle";
import { assertCohortIsJoinable, resolveSelfJoinCohortId } from "@/lib/joinCohortPolicy";

const BodySchema = z.object({
  cohortId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (isErrorResponse(authResult)) return authResult;

    if (!isRegistrationOpen()) {
      return err("Registration is closed for new cohort joins", 403);
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid body", 400);
    }

    const enrolmentCohortId = await resolveEnrolmentCohortId();
    const resolved = resolveSelfJoinCohortId(parsed.data.cohortId, enrolmentCohortId);
    if (!resolved.ok) return err(resolved.error, resolved.status);
    const cohortId = resolved.cohortId;
    const lifecycle = await getCohortLifecycle(cohortId);
    const joinable = assertCohortIsJoinable({
      cohortId,
      enrolmentCohortId,
      lifecycle,
    });
    if (!joinable.ok) return err(joinable.error, joinable.status);

    const db = adminDb();
    const ref = db.collection("users").doc(authResult.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return err("Profile not found", 404);
    }

    const data = snap.data() || {};
    const existingIds: string[] = Array.isArray(data.cohortIds)
      ? data.cohortIds.map(String)
      : [];

    if (userInCohort(existingIds, cohortId)) {
      await ref.set(
        {
          activeCohortId: cohortId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return ok({
        alreadyJoined: true,
        cohortId,
        cohortIds: existingIds,
      });
    }

    const now = new Date().toISOString();
    const cohortIds = [...new Set([...existingIds, cohortId])];
    const participation = {
      ...(typeof data.cohortParticipation === "object" && data.cohortParticipation
        ? data.cohortParticipation
        : {}),
      [cohortId]: {
        status: "pending",
        joinedAt: now,
        role: "attendee",
      },
    };

    await ref.set(
      {
        cohortIds,
        activeCohortId: cohortId,
        cohortParticipation: participation,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      alreadyJoined: false,
      cohortId,
      cohortIds,
    });
  } catch (e) {
    logServerRouteException("POST /api/me/join-cohort", e);
    return err("Failed to join cohort", 500);
  }
}
