/**
 * POST /api/me/ensure-profile
 *
 * Creates `users/{uid}` via Admin SDK when Firebase Auth has a user but Firestore
 * has no profile. Merges a pending `users/{email}` import when present, then
 * removes the email doc.
 *
 * Requires: Authorization: Bearer <Firebase ID token>
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { parseLocationFields } from "@/lib/locationCleanup";
import { findPendingUserByEmail } from "@/lib/server/userImportLookup";
import { applyPendingRowToEnsureProfileData } from "@/lib/server/mergePendingUserIntoProfile";
import type { UserProfile } from "@/types";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const uid = auth.uid;
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    return ok({
      created: false,
      profileExists: true,
      preRegistrationMatched: Boolean(existing.data()?.preRegistered),
    });
  }

  let record;
  try {
    record = await adminAuth().getUser(uid);
  } catch {
    return err("Firebase Auth user not found", 404);
  }

  const email = record.email ?? auth.email;
  if (!email) {
    return err("Account has no email; cannot create profile", 400);
  }

  const pending = await findPendingUserByEmail(db, email);
  const pre = pending?.data ?? null;
  const preDocId = pending?.docId;

  const preLocation = pre
    ? parseLocationFields(
        (pre.location && String(pre.location).trim()) ||
          [pre.city, pre.country].filter(Boolean).join(", ")
      )
    : { location: "", city: "", country: "" };

  const displayName = record.displayName?.trim() || "Anonymous";
  const emailLocal =
    record.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "";
  const handle =
    emailLocal.length > 0 ? emailLocal : uid.slice(0, 8);

  const isGoogle =
    record.providerData?.some((p) => p.providerId === "google.com") ?? false;

  const authProviderIds =
    record.providerData?.map((p) => p.providerId) ?? [];

  const userData: Record<string, unknown> = {
    uid,
    email: record.email || email,
    displayName,
    handle,
    photoURL: record.photoURL || "",
    role: "attendee",
    userStatus: "pending",
    registeredSessions: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    authProviders: authProviderIds,
    registrationSource: isGoogle ? "google" : "password",
    signedIn: true,
    registered: true,
    preRegistered: Boolean(pre),
  };

  if (pre && preDocId) {
    applyPendingRowToEnsureProfileData(
      userData,
      pre as UserProfile,
      record,
      preLocation
    );
  }

  const batch = db.batch();
  batch.set(userRef, userData, { merge: true });
  if (preDocId) {
    batch.delete(db.collection("users").doc(preDocId));
  }
  await batch.commit();

  return ok({
    created: true,
    profileExists: true,
    preRegistrationMatched: Boolean(pre),
  });
}
