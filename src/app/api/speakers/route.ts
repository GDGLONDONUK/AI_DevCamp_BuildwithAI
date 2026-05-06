/**
 * GET /api/speakers — list all speakers (public roster)
 */

import { adminDb } from "@/lib/firebase-admin";
import { ok, err } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET() {
  try {
    const snap = await adminDb()
      .collection("speakers")
      .orderBy("sortOrder", "asc")
      .get();
    const speakers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ok(speakers);
  } catch (e) {
    logServerRouteException("GET /api/speakers", e);
    return err("Failed to fetch speakers", 500);
  }
}
