import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "@/types";

const googleProvider = new GoogleAuthProvider();

export async function createUserDocument(
  user: User,
  additionalData?: Partial<UserProfile>
) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // Build base profile fields (no timestamps yet — avoids FieldValue vs Date conflict)
    const base: Omit<UserProfile, "createdAt" | "updatedAt"> = {
      uid: user.uid,
      email: user.email || "",
      displayName: additionalData?.displayName || user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      role: "attendee",
      userStatus: "pending",
      registeredSessions: [],
      ...additionalData,
    };
    // Write to Firestore: timestamps are FieldValue, not stored in the typed object
    await setDoc(userRef, {
      ...base,
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

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserDocument(result.user);
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
