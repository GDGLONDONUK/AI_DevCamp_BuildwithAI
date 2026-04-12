/**
 * GET   /api/users/[uid]  — get user profile (admin/moderator or own profile)
 * PATCH /api/users/[uid]  — update user status or role
 *
 * PATCH body (admin/moderator):
 *   { userStatus: "pending" | "participated" | "certified" | "not-certified" | "failed" }
 *   { role: "attendee" | "moderator" | "admin" }
 *
 * PATCH body (own profile — non-privileged fields only):
 *   { displayName, bio, city, country, linkedinUrl, githubUrl, websiteUrl,
 *     experienceLevel, skills, expertise, wantToLearn, canOffer, handle }
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, requireAdminOrSelf } from "@/lib/api-helpers";
import { FieldValue } from "firebase-admin/firestore";

type Params = { params: Promise<{ uid: string }> };

// Fields that only admins/moderators may change
const PRIVILEGED_FIELDS = ["role", "userStatus"];

// Fields a user may update on their own document
const SELF_EDITABLE_FIELDS = [
  "displayName", "bio", "city", "country", "location",
  "linkedinUrl", "githubUrl", "websiteUrl", "websiteURL",
  "experienceLevel", "skills", "expertise", "wantToLearn",
  "canOffer", "handle", "keepUpdated", "roleTitle", "photoURL",
];

export async function GET(request: NextRequest, { params }: Params) {
  const { uid } = await params;

  const auth = await requireAdminOrSelf(request, uid);
  if ("status" in auth && typeof auth.status === "number") return auth;

  try {
    const snap = await adminDb().collection("users").doc(uid).get();
    if (!snap.exists) return err("User not found", 404);
    return ok({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error(`GET /api/users/${uid}`, e);
    return err("Failed to fetch user", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { uid } = await params;

  const auth = await verifyAuth(request);
  if ("status" in auth && typeof auth.status === "number") return auth;

  const isAdmin = ["admin", "moderator"].includes(auth.role);
  const isSelf  = auth.uid === uid;

  if (!isAdmin && !isSelf) {
    return err("Forbidden", 403);
  }

  try {
    const body = await request.json();

    // Build the update payload — enforce field-level access control
    const update: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (PRIVILEGED_FIELDS.includes(key)) {
        if (!isAdmin) return err(`Only admins can update "${key}"`, 403);
        update[key] = value;
      } else if (SELF_EDITABLE_FIELDS.includes(key)) {
        update[key] = value;
      }
      // Unknown fields are silently dropped
    }

    if (Object.keys(update).length === 0) {
      return err("No valid fields to update");
    }

    update.updatedAt = FieldValue.serverTimestamp();

    await adminDb().collection("users").doc(uid).update(update);
    const updated = await adminDb().collection("users").doc(uid).get();
    return ok({ id: updated.id, ...updated.data() });
  } catch (e) {
    console.error(`PATCH /api/users/${uid}`, e);
    return err("Failed to update user", 500);
  }
}
