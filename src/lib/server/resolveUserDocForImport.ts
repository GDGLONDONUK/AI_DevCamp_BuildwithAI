import type { Firestore, DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import { isPendingImportUser } from "@/lib/server/userImportLookup";

const GMAIL_RE = /@gmail\.com$/i;
const GMAIL_UK_RE = /@googlemail\.com$/i;

/**
 * For bulk import: find where this user's Firestore `users` doc lives.
 * - `users/{email}` pending row, or
 * - `users/{uid}` when they already signed up (email field matches).
 * Returns `ref` to write; `existing` snapshot if a doc was found, else the email-key ref with no data.
 */
export async function resolveUserDocForImport(
  db: Firestore,
  emailNorm: string
): Promise<{ ref: DocumentReference; existing: DocumentSnapshot | null }> {
  if (!emailNorm?.includes("@")) {
    return { ref: db.collection("users").doc(emailNorm), existing: null };
  }

  const tryEmailDoc = async (e: string) => {
    const ref = db.collection("users").doc(e);
    const snap = await ref.get();
    return { ref, snap };
  };

  const candidates: string[] = [emailNorm];
  if (GMAIL_RE.test(emailNorm)) {
    candidates.push(emailNorm.replace(GMAIL_RE, "@googlemail.com"));
  } else if (GMAIL_UK_RE.test(emailNorm)) {
    candidates.push(emailNorm.replace(GMAIL_UK_RE, "@gmail.com"));
  }

  for (const e of new Set(candidates)) {
    const { ref, snap } = await tryEmailDoc(e);
    if (snap.exists) return { ref, existing: snap };
  }

  const q1 = await db
    .collection("users")
    .where("email", "==", emailNorm)
    .limit(5)
    .get();
  if (q1.empty && candidates.length > 1) {
    const q2 = await db
      .collection("users")
      .where("email", "==", candidates[1])
      .limit(5)
      .get();
    if (!q2.empty) {
      const d = q2.docs[0];
      return { ref: d.ref, existing: d };
    }
  } else if (!q1.empty) {
    const d = q1.docs[0];
    return { ref: d.ref, existing: d };
  }

  return { ref: db.collection("users").doc(emailNorm), existing: null };
}

/** Real account at `users/{uid}`, not a pending `users/{email}` import row. */
export function isLinkedProfile(
  data: Record<string, unknown> | undefined,
  docId: string
): boolean {
  if (!data) return false;
  const uid = typeof data.uid === "string" ? data.uid : "";
  // Auth-backed profile: document id is the Firebase uid (even if `signedIn` is missing or false)
  if (uid && docId === uid) return true;
  if (isPendingImportUser(data, docId)) return false;
  if (data.signedIn === true) return true;
  if (uid.length > 0 && !docId.includes("@")) return true;
  return false;
}
