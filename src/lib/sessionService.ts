import {
  collection, doc, getDocs, setDoc, updateDoc,
  deleteDoc, orderBy, query, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/types";
import { SESSIONS } from "@/data/sessions";

const COL = "sessions";

export async function getSessions(): Promise<Session[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("number")));
  return snap.docs.map((d) => d.data() as Session);
}

export async function upsertSession(session: Session): Promise<void> {
  const ref = doc(db, COL, session.id);
  await setDoc(ref, { ...session, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, COL, sessionId));
}

/** Seed Firestore with the default sessions.
 *  force=false → only adds missing sessions.
 *  force=true  → overwrites every session with the latest static data.
 */
export async function seedDefaultSessions(force = false): Promise<number> {
  const now = new Date().toISOString();
  if (force) {
    await Promise.all(
      SESSIONS.map((s) =>
        setDoc(doc(db, COL, s.id), { ...s, createdAt: now, updatedAt: now })
      )
    );
    return SESSIONS.length;
  }
  const existing = await getSessions();
  const existingIds = new Set(existing.map((s) => s.id));
  const toAdd = SESSIONS.filter((s) => !existingIds.has(s.id));
  await Promise.all(
    toAdd.map((s) =>
      setDoc(doc(db, COL, s.id), { ...s, createdAt: now, updatedAt: now })
    )
  );
  return toAdd.length;
}
