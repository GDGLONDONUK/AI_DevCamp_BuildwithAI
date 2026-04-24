/**
 * GET /api/public/handle-available?h=foo
 *
 * Public handle uniqueness check for /register. Client Firestore rules block anonymous
 * reads of other users' documents, so a direct `getDocs(where("handle", "==", h))` fails
 * with permission-denied when the handle is taken (or in some WebViews consistently).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

/** Matches register page normalization: lowercase a-z, 0-9, underscore, min length 2. */
const HANDLE_PARAM = /^[a-z0-9_]{2,32}$/;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("h")?.trim().toLowerCase() ?? "";
  if (!HANDLE_PARAM.test(raw)) {
    return err("Invalid handle", 400);
  }

  try {
    const snap = await adminDb()
      .collection("users")
      .where("handle", "==", raw)
      .limit(1)
      .get();
    return ok({ available: snap.empty });
  } catch (e) {
    logServerRouteException("GET /api/public/handle-available", e);
    return err("Lookup failed", 500);
  }
}
