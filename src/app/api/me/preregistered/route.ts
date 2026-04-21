/**
 * GET /api/me/preregistered — pending form import for this email (Admin SDK), for merge at sign-up.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, isErrorResponse } from "@/lib/api-helpers";
import { findPendingUserByEmail } from "@/lib/server/userImportLookup";
import type { UserProfile } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const email = auth.email;
  if (!email) {
    return ok({ row: null as UserProfile | null });
  }

  const found = await findPendingUserByEmail(adminDb(), email);
  return ok({ row: (found ? found.data : null) as UserProfile | null });
}
