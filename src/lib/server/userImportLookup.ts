import type { Firestore } from "firebase-admin/firestore";
import type { UserProfile } from "@/types";

function isEmailDocId(id: string): boolean {
  return id.includes("@");
}

/**
 * Pending form import lives at `users/{normalizedEmail}` with `signedIn: false`.
 * After sign-up, data is merged to `users/{uid}` and the email doc is removed.
 */
export function isPendingImportUser(data: Record<string, unknown> | undefined, docId: string): boolean {
  if (!data) return false;
  if (data.signedIn === false) return true;
  return isEmailDocId(docId) && data.preRegistered === true;
}

/**
 * Resolve pending `users` document by email (gmail ↔ googlemail aliases).
 */
export async function findPendingUserByEmail(
  db: Firestore,
  email: string | undefined
): Promise<{ docId: string; data: UserProfile } | null> {
  if (!email?.trim()) return null;
  const norm = email.toLowerCase().trim();
  const candidates = [norm];
  if (norm.includes("@googlemail.com")) {
    candidates.push(norm.replace("@googlemail.com", "@gmail.com"));
  }
  if (norm.includes("@gmail.com")) {
    candidates.push(norm.replace("@gmail.com", "@googlemail.com"));
  }
  const tried = new Set<string>();
  for (const id of candidates) {
    if (tried.has(id)) continue;
    tried.add(id);
    const snap = await db.collection("users").doc(id).get();
    if (!snap.exists) continue;
    const d = snap.data() as Record<string, unknown>;
    if (isPendingImportUser(d, snap.id)) {
      return { docId: snap.id, data: d as unknown as UserProfile };
    }
  }
  return null;
}
