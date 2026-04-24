/**
 * POST /api/me/leave-program
 *
 * Sets programme de-registration (no site login or API access until an admin clears it).
 * Requires: Authorization: Bearer <Firebase ID token>
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const ref = adminDb().collection("users").doc(auth.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return err("Profile not found", 404);
    }

    await ref.update({
      programOptOut: true,
      programOptOutAt: new Date().toISOString(),
      keepUpdated: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return ok({ left: true });
  } catch (e) {
    logServerRouteException("POST /api/me/leave-program", e);
    return err("Failed to leave programme", 500);
  }
}
