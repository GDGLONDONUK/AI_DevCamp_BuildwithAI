import {
  collection, doc, getDocs, setDoc,
  deleteDoc, orderBy, query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/types";
import { SESSIONS, getActiveCohortSessions } from "@/data/sessions";
import {
  getActiveCohortId,
  sessionsForCohort,
  SPRING_2026_COHORT_ID,
} from "@/lib/cohorts";

const COL = "sessions";

function withCohortId(s: Session): Session {
  return {
    ...s,
    cohortId: s.cohortId || SPRING_2026_COHORT_ID,
  };
}

/** All sessions (every cohort). Prefer {@link getSessionsForActiveCohort} in attendee UI. */
export async function getSessions(): Promise<Session[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("number")));
  return snap.docs.map((d) => withCohortId(d.data() as Session));
}

export async function getSessionsForCohort(cohortId: string): Promise<Session[]> {
  const all = await getSessions();
  return sessionsForCohort(all, cohortId).sort((a, b) => a.number - b.number);
}

export async function getSessionsForActiveCohort(): Promise<Session[]> {
  return getSessionsForCohort(getActiveCohortId());
}

export async function upsertSession(session: Session): Promise<void> {
  const ref = doc(db, COL, session.id);
  const payload = withCohortId({
    ...session,
    cohortId: session.cohortId || getActiveCohortId(),
  });
  await setDoc(ref, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, COL, sessionId));
}

/**
 * Seed Firestore with programme sessions.
 * force=false → only adds missing sessions (all cohorts in `SESSIONS`).
 * force=true  → overwrites every static session with latest data.
 */
export async function seedDefaultSessions(force = false): Promise<number> {
  const now = new Date().toISOString();
  const source = SESSIONS;
  if (force) {
    await Promise.all(
      source.map((s) =>
        setDoc(doc(db, COL, s.id), {
          ...withCohortId(s),
          createdAt: now,
          updatedAt: now,
        })
      )
    );
    return source.length;
  }
  const existing = await getSessions();
  const existingIds = new Set(existing.map((s) => s.id));
  const toAdd = source.filter((s) => !existingIds.has(s.id));
  await Promise.all(
    toAdd.map((s) =>
      setDoc(doc(db, COL, s.id), {
        ...withCohortId(s),
        createdAt: now,
        updatedAt: now,
      })
    )
  );
  return toAdd.length;
}

/** Static fallback for SSR / offline when Firestore is empty. */
export function getStaticActiveSessions(): Session[] {
  return getActiveCohortSessions();
}
