/**
 * POST /api/me/join-hackathon
 * Open registrants (not already in the live cohort) opt into the Agentic Hackathon.
 * Cohort attendees are already eligible — this still stamps hackathonParticipant.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { isHackathonEligible } from "@/lib/hackathon/access";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (isErrorResponse(authResult)) return authResult;

    const db = adminDb();
    const ref = db.collection("users").doc(authResult.uid);
    const snap = await ref.get();
    if (!snap.exists) return err("Profile not found — complete registration first", 404);

    const data = snap.data() || {};
    const live = await resolveActiveCohortIdFromDb();
    const already = isHackathonEligible(
      {
        cohortIds: data.cohortIds,
        hackathonParticipant: data.hackathonParticipant,
        role: data.role,
      },
      live
    );

    await ref.set(
      {
        hackathonParticipant: true,
        hackathonJoinedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      joined: true,
      alreadyEligible: already,
      hackathonParticipant: true,
      message: already
        ? "You were already eligible (cohort or staff). Hackathon participation confirmed."
        : "You are registered for the Agentic Hackathon. Submit your project under Hackathon → My project.",
    });
  } catch (e) {
    logServerRouteException("POST /api/me/join-hackathon", e);
    return err("Failed to join hackathon", 500);
  }
}
