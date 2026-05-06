/**
 * GET /api/buddies/directory — list attendees with DevcampBuddies public profiles (sanitized).
 * Query: ?q=substring optional filter on display name.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import {
  buddyUidsForUser,
  isEligibleBuddyParticipant,
  publicBuddyCardFromUser,
  realUidFromUserDoc,
} from "@/lib/server/buddies";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const qParam = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  try {
    const buddyUids = await buddyUidsForUser(auth.uid);

    const snap = await adminDb()
      .collection("users")
      .where("profilePublic", "==", true)
      .orderBy("displayName")
      .limit(600)
      .get();

    const items: Record<string, unknown>[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!isEligibleBuddyParticipant(data, doc.id)) continue;
      const uid = realUidFromUserDoc(data, doc.id);
      if (!uid || uid === auth.uid) continue;

      const card = publicBuddyCardFromUser(uid, data);
      if (!card) continue;
      const name = String(card.displayName ?? "").toLowerCase();
      if (qParam && !name.includes(qParam)) continue;
      items.push({
        ...card,
        isBuddy: buddyUids.has(uid),
      });
    }

    return ok({ profiles: items });
  } catch (e) {
    logServerRouteException("GET /api/buddies/directory", e);
    return err("Failed to load directory", 500);
  }
}
