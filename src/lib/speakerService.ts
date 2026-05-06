import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Speaker } from "@/types";
import { SPEAKERS } from "@/data/speakers";

const COL = "speakers";

export async function getSpeakers(): Promise<Speaker[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("sortOrder", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Speaker));
}

export async function upsertSpeaker(speaker: Speaker): Promise<void> {
  const ref = doc(db, COL, speaker.id);
  await setDoc(
    ref,
    { ...speaker, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function deleteSpeaker(speakerId: string): Promise<void> {
  await deleteDoc(doc(db, COL, speakerId));
}

/** Seed Firestore with the default roster. force=true overwrites every speaker doc. */
export async function seedDefaultSpeakers(force = false): Promise<number> {
  const now = new Date().toISOString();
  if (force) {
    await Promise.all(
      SPEAKERS.map((s) =>
        setDoc(doc(db, COL, s.id), { ...s, createdAt: now, updatedAt: now })
      )
    );
    return SPEAKERS.length;
  }
  const existing = await getSpeakers();
  const existingIds = new Set(existing.map((s) => s.id));
  const toAdd = SPEAKERS.filter((s) => !existingIds.has(s.id));
  await Promise.all(
    toAdd.map((s) =>
      setDoc(doc(db, COL, s.id), { ...s, createdAt: now, updatedAt: now })
    )
  );
  return toAdd.length;
}
