/**
 * GET /api/buddies/profile/[uid] — public card + buddy-only extras when viewer is connected.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import {
  fetchBuddyProjectsForUser,
  isEligibleBuddyParticipant,
  pairExists,
  publicBuddyCardFromUser,
  realUidFromUserDoc,
} from "@/lib/server/buddies";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Params = { params: Promise<{ uid: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { uid: targetUid } = await params;
  if (!targetUid?.trim()) return err("Invalid uid", 400);

  try {
    const snap = await adminDb().collection("users").doc(targetUid).get();
    if (!snap.exists) return err("Profile not found", 404);

    const data = snap.data();
    if (!isEligibleBuddyParticipant(data, snap.id)) {
      return err("Profile not found", 404);
    }

    const realUid = realUidFromUserDoc(data!, snap.id);
    if (!realUid || realUid !== targetUid) return err("Profile not found", 404);

    const base = publicBuddyCardFromUser(realUid, data);
    if (!base) return err("Profile not found", 404);

    const viewerIsSelf = auth.uid === realUid;
    const isBuddy = viewerIsSelf || (await pairExists(auth.uid, realUid));
    const isAdmin = ["admin", "moderator"].includes(auth.role);

    let buddyExtras: Record<string, unknown> | undefined;
    if (viewerIsSelf || isBuddy || isAdmin) {
      const projects = await fetchBuddyProjectsForUser(realUid);
      buddyExtras = {
        githubUrl: data?.githubUrl ?? undefined,
        websiteUrl: data?.websiteUrl ?? undefined,
        projects,
      };
    }

    return ok({
      profile: base,
      viewerIsSelf,
      isBuddy: viewerIsSelf || isBuddy,
      buddyExtras,
    });
  } catch (e) {
    logServerRouteException(`GET /api/buddies/profile/${targetUid}`, e);
    return err("Failed to load profile", 500);
  }
}
