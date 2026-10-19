/**
 * Programme data access tiers — honour these everywhere (HTTP APIs, MCP, learning chat).
 *
 * | Tier       | Source of truth                         | Who                                      |
 * |------------|-----------------------------------------|------------------------------------------|
 * | public     | Firestore `sessions`, `speakers`        | Anyone (website); MCP with any valid token |
 * | attendee   | `sessionLearningMaterials`, own tasks   | Signed-in + enrolled in cohort (or staff)|
 * | admin      | users, all assignments, writes          | role admin\|moderator + admin MCP scope  |
 *
 * Seed files under `src/data/*` and `scripts/data/*` are for sync/seed only —
 * runtime reads must use Firestore.
 */

import { adminDb } from "@/lib/firebase-admin";
import { userInCohort } from "@/lib/cohorts";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";

export type ProgrammeActor = {
  uid: string;
  email?: string;
  role: string;
  cohortIds: string[];
  activeCohortId?: string;
};

export function isStaffRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "moderator";
}

/** Enrolled in the given cohort (or staff — organisers may browse any cohort). */
export function actorEnrolledInCohort(
  actor: Pick<ProgrammeActor, "role" | "cohortIds">,
  cohortId: string
): boolean {
  if (isStaffRole(actor.role)) return true;
  return userInCohort(actor.cohortIds, cohortId);
}

/**
 * Default cohort for learning chat / MCP when the client does not pass one.
 * Prefer the live programme cohort from Firestore (`cohorts.isCurrent`) when the
 * user is staff or enrolled there — do not stick on a stale users.activeCohortId
 * from a past cohort (e.g. spring / June).
 */
export async function resolveDefaultCohortId(
  actor: Pick<ProgrammeActor, "role" | "cohortIds" | "activeCohortId">
): Promise<string> {
  const programmeActive = await resolveActiveCohortIdFromDb();
  if (isStaffRole(actor.role) || userInCohort(actor.cohortIds, programmeActive)) {
    return programmeActive;
  }
  return (actor.activeCohortId || programmeActive).trim();
}

/**
 * Load user + enforce not archived / disabled / opted out.
 */
export async function loadActiveProgrammeActor(uid: string): Promise<ProgrammeActor> {
  const db = adminDb();
  const [userSnap, archivedSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("disabledUsers").doc(uid).get(),
  ]);

  if (archivedSnap.exists) {
    throw new Error("Account archived / disabled.");
  }
  if (!userSnap.exists) {
    throw new Error("User profile not found — complete registration on the site first.");
  }
  const d = userSnap.data()!;
  if (d.accountDisabled === true) {
    throw new Error("Account disabled.");
  }
  if (d.programOptOut === true) {
    throw new Error("Programme opt-out — contact organisers for access.");
  }

  return {
    uid,
    email: typeof d.email === "string" ? d.email : undefined,
    role: (d.role as string) || "attendee",
    cohortIds: Array.isArray(d.cohortIds)
      ? d.cohortIds.filter((x): x is string => typeof x === "string")
      : [],
    activeCohortId: typeof d.activeCohortId === "string" ? d.activeCohortId : undefined,
  };
}

export type AttendeeGateResult =
  | { ok: true; cohortId: string; actor: ProgrammeActor }
  | { ok: false; error: string; status: 403 | 404 };

/**
 * Attendee-tier gate for HTTP learning chat (and similar).
 */
export async function requireAttendeeForCohort(
  uid: string,
  roleFromAuth: string,
  cohortId?: string
): Promise<AttendeeGateResult> {
  try {
    const actor = await loadActiveProgrammeActor(uid);
    actor.role = actor.role || roleFromAuth;
    const cid = (cohortId || (await resolveDefaultCohortId(actor))).trim();
    if (!actorEnrolledInCohort(actor, cid)) {
      return {
        ok: false,
        error:
          "Attendee access requires enrolment in this cohort. Join the programme on the site, or use only public session tools.",
        status: 403,
      };
    }
    return { ok: true, cohortId: cid, actor };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Access denied";
    if (/not found/i.test(msg)) return { ok: false, error: msg, status: 404 };
    return { ok: false, error: msg, status: 403 };
  }
}

/** Fields safe on the public website / public MCP schedule tools (no corpus text). */
export function publicScheduleSessionFields(session: {
  id: string;
  number?: number;
  title?: string;
  date?: string;
  time?: string;
  week?: number;
  topic?: string;
  description?: string;
  isKickoff?: boolean;
  isClosing?: boolean;
  speakers?: Array<{ name?: string; title?: string }>;
  videoUrl?: string;
  resources?: Array<{ title?: string; url?: string }>;
}) {
  return {
    id: session.id,
    number: session.number,
    title: session.title,
    date: session.date,
    time: session.time,
    week: session.week,
    topic: session.topic,
    description: session.description,
    isKickoff: session.isKickoff,
    isClosing: session.isClosing,
    hasVideo: Boolean(session.videoUrl),
    resourceCount: session.resources?.length ?? 0,
    speakers: (session.speakers || []).map((s) => ({
      name: s.name,
      title: s.title,
    })),
  };
}
