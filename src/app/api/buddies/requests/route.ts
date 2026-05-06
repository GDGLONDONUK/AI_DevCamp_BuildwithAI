/**
 * GET  /api/buddies/requests — incoming + outgoing pending buddy requests (enriched).
 * POST /api/buddies/requests — send a buddy request { toUid }.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { created, ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { buddyRequestCreateSchema } from "@/lib/api/schemas/requestBodies";
import {
  type BuddyRequestDoc,
  createBuddyRequest,
  enrichRequestRow,
  isEligibleBuddyParticipant,
  realUidFromUserDoc,
} from "@/lib/server/buddies";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const db = adminDb();
    const [incomingSnap, outgoingSnap] = await Promise.all([
      db
        .collection("buddyRequests")
        .where("toUid", "==", auth.uid)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
      db
        .collection("buddyRequests")
        .where("fromUid", "==", auth.uid)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
    ]);

    const incoming = await Promise.all(
      incomingSnap.docs.map((d) =>
        enrichRequestRow(d.id, d.data() as BuddyRequestDoc)
      )
    );
    const outgoing = await Promise.all(
      outgoingSnap.docs.map((d) =>
        enrichRequestRow(d.id, d.data() as BuddyRequestDoc)
      )
    );

    return ok({ incoming, outgoing });
  } catch (e) {
    logServerRouteException("GET /api/buddies/requests", e);
    return err("Failed to load requests", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(request, buddyRequestCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { toUid } = parsed.data;

  try {
    const callerSnap = await adminDb().collection("users").doc(auth.uid).get();
    const callerData = callerSnap.data();
    if (!callerSnap.exists || callerData?.profilePublic !== true) {
      return err(
        "Enable a public profile on your settings page to connect with other attendees",
        403
      );
    }

    const targetSnap = await adminDb().collection("users").doc(toUid).get();
    const targetData = targetSnap.data();
    if (!targetSnap.exists || !isEligibleBuddyParticipant(targetData, targetSnap.id)) {
      return err("That attendee is not available for buddy requests", 404);
    }

    const targetReal = realUidFromUserDoc(targetData, targetSnap.id);
    if (!targetReal || targetReal !== toUid) {
      return err("That attendee is not available for buddy requests", 404);
    }

    const result = await createBuddyRequest(auth.uid, toUid);

    if (result.mode === "duplicate") {
      return ok({
        status: "duplicate" as const,
        requestId: result.requestId,
        message: "A pending request already exists",
      });
    }

    if (result.mode === "connected") {
      return ok({
        status: "connected" as const,
        requestId: result.requestId,
        message: "You are now buddies — they had already sent you a request",
      });
    }

    return created({
      status: "pending" as const,
      requestId: result.requestId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SELF") return err("You cannot send a request to yourself", 400);
    if (msg === "ALREADY_BUDDIES") return err("You are already buddies with this person", 409);
    logServerRouteException("POST /api/buddies/requests", e);
    return err("Failed to send request", 500);
  }
}
