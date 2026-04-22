/**
 * POST /api/admin/approve-all-users
 * Sets `userStatus` (and `status`) to "participated" for all users that are still
 * "pending" or have no userStatus (open-access policy; use once after policy change).
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";

const BATCH = 450;

export async function POST(_request: NextRequest) {
  const auth = await requireAdmin(_request);
  if (auth instanceof Response) return auth;

  try {
    const db = adminDb();
    const snap = await db.collection("users").get();
    const toUpdate = snap.docs.filter((d) => {
      const s = d.data().userStatus;
      return s === "pending" || s === undefined || s === null;
    });

    if (toUpdate.length === 0) {
      return ok({ updated: 0, message: "No pending users found" });
    }

    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = db.batch();
      for (const d of toUpdate.slice(i, i + BATCH)) {
        batch.set(
          d.ref,
          {
            userStatus: "participated",
            status: "participated",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }

    return ok({ updated: toUpdate.length });
  } catch (e) {
    logServerRouteException("POST /api/admin/approve-all-users", e);
    return err("Bulk approve failed", 500);
  }
}
