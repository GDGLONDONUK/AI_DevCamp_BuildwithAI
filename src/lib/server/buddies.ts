/**
 * DevcampBuddies — Firestore helpers (Admin SDK). Collections: `buddyRequests`, `buddyPairs`.
 */

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { Project, UserProfile } from "@/types";

export type BuddyRequestStatus = "pending" | "accepted" | "rejected";

export interface BuddyRequestDoc {
  fromUid: string;
  toUid: string;
  status: BuddyRequestStatus;
  createdAt: FirebaseFirestore.Timestamp;
  respondedAt?: FirebaseFirestore.Timestamp;
}

export interface BuddyPairDoc {
  uids: [string, string];
  createdAt: FirebaseFirestore.Timestamp;
}

export function buddyPairDocId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}__${uidB}` : `${uidB}__${uidA}`;
}

export function tsToIso(t: unknown): string | undefined {
  if (!t) return undefined;
  if (t instanceof Timestamp) return t.toDate().toISOString();
  if (typeof (t as { toDate?: () => Date }).toDate === "function") {
    return (t as Timestamp).toDate().toISOString();
  }
  return undefined;
}

/** Real Firebase uid for a `users/{docId}` row (excludes email-keyed pending). */
export function realUidFromUserDoc(
  data: FirebaseFirestore.DocumentData | undefined,
  docId: string
): string | null {
  if (!data) return null;
  const isEmailKey = docId.includes("@");
  const uid =
    typeof data.uid === "string" && data.uid.length > 0
      ? data.uid
      : isEmailKey
        ? ""
        : docId;
  if (!uid) return null;
  const signedIn =
    data.signedIn === false ? false : data.signedIn === true ? true : !isEmailKey;
  if (!signedIn) return null;
  return uid;
}

export function isEligibleBuddyParticipant(
  data: FirebaseFirestore.DocumentData | undefined,
  docId: string
): boolean {
  if (!data) return false;
  if (data.programOptOut === true || data.accountDisabled === true) return false;
  if (data.profilePublic !== true) return false;
  return realUidFromUserDoc(data, docId) !== null;
}

/** Fields visible to any signed-in attendee for a public profile. */
export function publicBuddyCardFromUser(
  uid: string,
  data: FirebaseFirestore.DocumentData | undefined
): Record<string, unknown> | null {
  if (!data) return null;
  return {
    uid,
    displayName: String(data.displayName ?? ""),
    photoURL: data.photoURL ?? undefined,
    bio: data.bio ?? undefined,
    linkedinUrl: data.linkedinUrl ?? undefined,
    city: data.city ?? undefined,
    country: data.country ?? undefined,
    location: data.location ?? undefined,
    experienceLevel: data.experienceLevel ?? undefined,
    skills: Array.isArray(data.skills) ? data.skills : undefined,
    expertise: Array.isArray(data.expertise) ? data.expertise : undefined,
    wantToLearn: Array.isArray(data.wantToLearn) ? data.wantToLearn : undefined,
    canOffer: Array.isArray(data.canOffer) ? data.canOffer : undefined,
    priorAIKnowledgeTags: Array.isArray(data.priorAIKnowledgeTags)
      ? data.priorAIKnowledgeTags
      : undefined,
    handle: data.handle ?? undefined,
    profilePublic: true,
  };
}

export type BuddyProjectSummary = Pick<
  Project,
  "title" | "githubUrl" | "demoUrl" | "weekCompleted" | "status"
> & { id: string };

export async function fetchBuddyProjectsForUser(
  userId: string,
  limit = 24
): Promise<BuddyProjectSummary[]> {
  const db = adminDb();
  const snap = await db
    .collection("projects")
    .where("userId", "==", userId)
    .orderBy("submittedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const p = d.data() as Project;
    return {
      id: d.id,
      title: p.title,
      githubUrl: p.githubUrl,
      demoUrl: p.demoUrl,
      weekCompleted: p.weekCompleted,
      status: p.status,
    };
  });
}

export async function pairExists(uidA: string, uidB: string): Promise<boolean> {
  const id = buddyPairDocId(uidA, uidB);
  const snap = await adminDb().collection("buddyPairs").doc(id).get();
  return snap.exists;
}

/** Other user ids linked to `uid` via accepted buddy pairs (for directory / UX flags). */
export async function buddyUidsForUser(uid: string): Promise<Set<string>> {
  const snap = await adminDb()
    .collection("buddyPairs")
    .where("uids", "array-contains", uid)
    .get();
  const set = new Set<string>();
  for (const doc of snap.docs) {
    const raw = doc.data().uids as unknown;
    if (!Array.isArray(raw)) continue;
    for (const u of raw) {
      if (typeof u === "string" && u !== uid) set.add(u);
    }
  }
  return set;
}

async function acceptPendingRequestInTransaction(
  requestRef: DocumentReference,
  fromUid: string,
  toUid: string
): Promise<void> {
  const db = adminDb();
  const pairId = buddyPairDocId(fromUid, toUid);
  const pairRef = db.collection("buddyPairs").doc(pairId);
  await db.runTransaction(async (t) => {
    const reqSnap = await t.get(requestRef);
    if (!reqSnap.exists) throw new Error("REQUEST_NOT_FOUND");
    const r = reqSnap.data() as BuddyRequestDoc;
    if (r.status !== "pending") throw new Error("NOT_PENDING");
    if (r.fromUid !== fromUid || r.toUid !== toUid) throw new Error("REQUEST_MISMATCH");

    const pairSnap = await t.get(pairRef);
    if (!pairSnap.exists) {
      const a = fromUid < toUid ? fromUid : toUid;
      const b = fromUid < toUid ? toUid : fromUid;
      t.set(pairRef, {
        uids: [a, b] as [string, string],
        createdAt: FieldValue.serverTimestamp(),
      });
      t.update(db.collection("users").doc(fromUid), {
        buddyCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      t.update(db.collection("users").doc(toUid), {
        buddyCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    t.update(requestRef, {
      status: "accepted" as const,
      respondedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function acceptBuddyRequest(requestId: string, actorUid: string): Promise<void> {
  const db = adminDb();
  const requestRef = db.collection("buddyRequests").doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error("REQUEST_NOT_FOUND");
  const r = reqSnap.data() as BuddyRequestDoc;
  if (r.toUid !== actorUid) throw new Error("FORBIDDEN");
  if (r.status !== "pending") throw new Error("NOT_PENDING");
  await acceptPendingRequestInTransaction(requestRef, r.fromUid, r.toUid);
}

export async function rejectBuddyRequest(requestId: string, actorUid: string): Promise<void> {
  const db = adminDb();
  const requestRef = db.collection("buddyRequests").doc(requestId);
  const reqSnap = await requestRef.get();
  if (!reqSnap.exists) throw new Error("REQUEST_NOT_FOUND");
  const r = reqSnap.data() as BuddyRequestDoc;
  if (r.toUid !== actorUid) throw new Error("FORBIDDEN");
  if (r.status !== "pending") throw new Error("NOT_PENDING");
  await requestRef.update({
    status: "rejected" as const,
    respondedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Create pending request A→B, or auto-accept if B→A pending already.
 * Returns { mode: "created", requestId } | { mode: "connected", requestId } | error codes via throws.
 */
export async function createBuddyRequest(fromUid: string, toUid: string): Promise<
  | { mode: "created"; requestId: string }
  | { mode: "connected"; requestId: string }
  | { mode: "duplicate"; requestId: string }
> {
  if (fromUid === toUid) throw new Error("SELF");

  const db = adminDb();

  if (await pairExists(fromUid, toUid)) {
    throw new Error("ALREADY_BUDDIES");
  }

  const reverseSnap = await db
    .collection("buddyRequests")
    .where("fromUid", "==", toUid)
    .where("toUid", "==", fromUid)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!reverseSnap.empty) {
    const revDoc = reverseSnap.docs[0];
    await acceptBuddyRequest(revDoc.id, fromUid);
    return { mode: "connected", requestId: revDoc.id };
  }

  const dupSnap = await db
    .collection("buddyRequests")
    .where("fromUid", "==", fromUid)
    .where("toUid", "==", toUid)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!dupSnap.empty) {
    return { mode: "duplicate", requestId: dupSnap.docs[0].id };
  }

  const docRef = db.collection("buddyRequests").doc();
  await docRef.set({
    fromUid,
    toUid,
    status: "pending" as const,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { mode: "created", requestId: docRef.id };
}

async function displayNameFor(uid: string): Promise<string> {
  const snap = await adminDb().collection("users").doc(uid).get();
  const data = snap.data() as UserProfile | undefined;
  return (data?.displayName && String(data.displayName).trim()) || "Attendee";
}

export async function enrichRequestRow(
  id: string,
  r: BuddyRequestDoc
): Promise<Record<string, unknown>> {
  const [fromName, toName] = await Promise.all([
    displayNameFor(r.fromUid),
    displayNameFor(r.toUid),
  ]);
  return {
    id,
    fromUid: r.fromUid,
    toUid: r.toUid,
    status: r.status,
    createdAt: tsToIso(r.createdAt),
    respondedAt: tsToIso(r.respondedAt),
    fromDisplayName: fromName,
    toDisplayName: toName,
  };
}
