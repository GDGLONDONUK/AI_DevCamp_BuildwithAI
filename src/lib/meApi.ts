/**
 * Authenticated calls to /api/me/* (Firebase ID token).
 */

import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export interface EnsureProfileResult {
  created: boolean;
  profileExists: boolean;
  preRegistrationMatched: boolean;
}

export async function ensureProfileOnServer(): Promise<EnsureProfileResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  const res = await fetch("/api/me/ensure-profile", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) {
    if (json.code === "ACCOUNT_DISABLED") {
      throw new Error("ACCOUNT_DISABLED");
    }
    throw new Error(json.error || "ensure-profile failed");
  }
  return json.data as EnsureProfileResult;
}

export async function fetchMyPreregisteredRow(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch("/api/me/preregistered", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) return null;
  return (json.data?.row ?? null) as UserProfile | null;
}

export async function linkPreregisterRowOnServer(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdToken();
  const res = await fetch("/api/me/link-preregister", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.ok) return false;
  return Boolean(json.data?.linked);
}
