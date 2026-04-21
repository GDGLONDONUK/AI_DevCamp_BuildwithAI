/**
 * POST /api/me/link-preregister — remove pending `users/{email}` import after profile is created (idempotent).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, isErrorResponse } from "@/lib/api-helpers";
import { findPendingUserByEmail } from "@/lib/server/userImportLookup";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const email = auth.email;
  if (!email) {
    return ok({ linked: false });
  }

  const db = adminDb();
  const found = await findPendingUserByEmail(db, email);
  if (!found) {
    return ok({ linked: false });
  }

  await db.collection("users").doc(found.docId).delete();

  return ok({ linked: true });
}
