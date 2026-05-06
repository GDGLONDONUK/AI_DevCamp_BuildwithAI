/**
 * GET /api/buddies/connections — accepted buddies for the signed-in user (with buddy-only extras).
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import {
  fetchBuddyProjectsForUser,
  publicBuddyCardFromUser,
  tsToIso,
} from "@/lib/server/buddies";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const pairsSnap = await adminDb()
      .collection("buddyPairs")
      .where("uids", "array-contains", auth.uid)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const buddies: Record<string, unknown>[] = [];

    for (const doc of pairsSnap.docs) {
      const d = doc.data();
      const uids = d.uids as string[] | undefined;
      if (!Array.isArray(uids) || uids.length !== 2) continue;
      const otherUid = uids.find((u) => u !== auth.uid);
      if (!otherUid) continue;

      const userSnap = await adminDb().collection("users").doc(otherUid).get();
      const data = userSnap.data();
      const base = publicBuddyCardFromUser(otherUid, data);
      if (!base) continue;

      const projects = await fetchBuddyProjectsForUser(otherUid);
      buddies.push({
        ...base,
        pairSince: tsToIso(d.createdAt),
        buddyExtras: {
          githubUrl: data?.githubUrl ?? undefined,
          websiteUrl: data?.websiteUrl ?? undefined,
          projects,
        },
      });
    }

    return ok({ buddies });
  } catch (e) {
    logServerRouteException("GET /api/buddies/connections", e);
    return err("Failed to load buddies", 500);
  }
}
