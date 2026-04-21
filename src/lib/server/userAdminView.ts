import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { UserProfile } from "@/types";

/**
 * Normalise a `users` document for admin / API (pending email-keyed vs Auth uid–keyed).
 */
export function userSnapshotToAdminProfile(
  d: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }
): UserProfile {
  const id = d.id;
  const data = d.data() as Record<string, unknown>;
  const isEmailKey = id.includes("@");
  const signedIn =
    data.signedIn === false
      ? false
      : data.signedIn === true
        ? true
        : !isEmailKey;
  const uid =
    typeof data.uid === "string" && data.uid.length > 0
      ? data.uid
      : isEmailKey
        ? ""
        : id;
  const email = (typeof data.email === "string" && data.email) || (isEmailKey ? id : "");
  return {
    ...(data as unknown as UserProfile),
    email: email || id,
    uid,
    signedIn,
    registered:
      data.registered !== undefined
        ? Boolean(data.registered)
        : signedIn,
    firestoreId: id,
  };
}
