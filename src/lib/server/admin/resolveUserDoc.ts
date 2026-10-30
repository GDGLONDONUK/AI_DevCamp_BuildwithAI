import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { resolveUserDocForImport } from "@/lib/server/resolveUserDocForImport";

/**
 * Resolve `users/{uid}` or a user by email (pending email-key docs included).
 * Admin SDK — call only after requireAdmin / requireAdminOrSelf.
 */
export async function resolveUserDoc(uidOrEmail: string): Promise<DocumentSnapshot | null> {
  const key = uidOrEmail.trim();
  if (!key) return null;
  const db = adminDb();
  const direct = await db.collection("users").doc(key).get();
  if (direct.exists) return direct;
  if (!key.includes("@")) return null;
  const { existing } = await resolveUserDocForImport(db, key.toLowerCase());
  return existing?.exists ? existing : null;
}
