/**
 * POST /api/me/ensure-profile
 *
 * Creates `users/{uid}` via Admin SDK when Firebase Auth has a user but Firestore
 * has no profile. Merges a pending `users/{email}` import when present, then
 * removes the email doc.
 *
 * Auth: ID token only (not full verifyAuth). Spring-archived accounts with a
 * fresh pending import must reach ensureUserProfileForUid to reopen — verifyAuth
 * would otherwise return ACCOUNT_DISABLED before that logic runs.
 *
 * Requires: Authorization: Bearer <Firebase ID token>
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { ok, err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { ensureUserProfileForUid } from "@/lib/server/ensureUserProfileDocument";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return err("Missing Authorization header", 401);

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return err("Invalid or expired token", 401);
  }

  try {
    const result = await ensureUserProfileForUid(uid);
    return ok({
      created: result.created,
      profileExists: result.profileExists,
      preRegistrationMatched: result.preRegistrationMatched,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "ACCOUNT_DISABLED" || message.includes("ACCOUNT_DISABLED")) {
      return NextResponse.json(
        {
          ok: false,
          error: "This account has been disabled. Contact the organisers if you need help.",
          code: "ACCOUNT_DISABLED",
        },
        { status: 403 }
      );
    }
    if (message === "REGISTRATION_CLOSED" || message.includes("REGISTRATION_CLOSED")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "New registrations are closed. Sign in with your existing DevCamp account, or contact the organisers.",
          code: "REGISTRATION_CLOSED",
        },
        { status: 403 }
      );
    }
    if (message === "PROGRAM_OPT_OUT" || message.includes("PROGRAM_OPT_OUT")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "You have left the programme. Contact the organisers if you need access again.",
          code: "PROGRAM_OPT_OUT",
        },
        { status: 403 }
      );
    }
    if (message.includes("not found") || message.includes("Auth user not found")) {
      return err("Firebase Auth user not found", 404);
    }
    if (message.includes("no email")) {
      return err("Account has no email; cannot create profile", 400);
    }
    logServerRouteException("POST /api/me/ensure-profile", e);
    return err(message, 500);
  }
}
