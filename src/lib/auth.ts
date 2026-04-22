import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { stripUndefinedForFirestoreClient } from "@/lib/stripUndefinedFirestore";
import { UserProfile } from "@/types";

/** Firebase `providerId` list for admin badges (e.g. google.com, password). */
export function authProviderIdsFromUser(user: User): string[] {
  return user.providerData.map((p) => p.providerId);
}

/**
 * Persists current Firebase sign-in method(s) on `users/{uid}` (merge). No-op if
 * the user document does not exist yet.
 */
export async function syncAuthProvidersToUserDoc(user: User): Promise<void> {
  const ids = authProviderIdsFromUser(user);
  if (ids.length === 0) return;
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return;
  await setDoc(
    userRef,
    { authProviders: ids, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

const googleProvider = new GoogleAuthProvider();

export async function createUserDocument(
  user: User,
  additionalData?: Partial<UserProfile>
) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // Build base profile fields (no timestamps yet — avoids FieldValue vs Date conflict)
    const base: Record<string, unknown> = {
      uid: user.uid,
      email: user.email || "",
      displayName: additionalData?.displayName || user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      role: "attendee",
      userStatus: "participated",
      registeredSessions: [],
      ...additionalData,
    };
    const clean = stripUndefinedForFirestoreClient(base);
    // Write to Firestore: timestamps are FieldValue, not stored in the typed object
    await setDoc(userRef, {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return userRef;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await createUserDocument(result.user, { displayName });
  return result;
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Send Firebase password-reset email (email/password accounts only).
 * The user follows the link in the email to choose a new password.
 */
export async function sendPasswordResetToEmail(email: string): Promise<void> {
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const url = base ? `${base.replace(/\/$/, "")}/` : undefined;
  await sendPasswordResetEmail(
    auth,
    email,
    url
      ? {
          url,
          handleCodeInApp: false,
        }
      : undefined
  );
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  // Firestore profile is created by POST /api/me/ensure-profile from AuthContext
  // when missing (Admin SDK).
  return result;
}

export async function logout() {
  return signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }
  return null;
}

/** For admin UI: true if this account can sign in with Google. */
export function userAuthShowsGoogle(u: Pick<UserProfile, "authProviders" | "registrationSource">): boolean {
  if (Array.isArray(u.authProviders) && u.authProviders.length > 0) {
    return u.authProviders.includes("google.com");
  }
  return u.registrationSource === "google";
}

/** For admin UI: true if this account can sign in with email/password. */
export function userAuthShowsPassword(
  u: Pick<UserProfile, "authProviders" | "registrationSource">
): boolean {
  if (Array.isArray(u.authProviders) && u.authProviders.length > 0) {
    return u.authProviders.includes("password");
  }
  return u.registrationSource === "password";
}
