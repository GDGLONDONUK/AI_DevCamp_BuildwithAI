import { adminDb } from "@/lib/firebase-admin";

/** Display label for audit fields — prefers Firestore profile name, then email (doc or token fallback). */
export async function resolveLearningTaskActor(
  uid: string,
  fallbackEmail?: string | null
): Promise<{ uid: string; label: string }> {
  const snap = await adminDb().collection("users").doc(uid).get();
  const d = snap.data();
  const name = typeof d?.displayName === "string" ? d.displayName.trim() : "";
  const docEmail = typeof d?.email === "string" ? d.email.trim() : "";
  const email = docEmail || (fallbackEmail?.trim() ?? "");
  const label = name || email || uid;
  return { uid, label };
}
