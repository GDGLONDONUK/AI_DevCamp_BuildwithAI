/**
 * Organiser completion snapshot: attendance + assignments + projects.
 * Admin SDK only — never expose via attendee MCP or client reads.
 */

import { adminDb } from "@/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { isStaffRole } from "@/lib/access/programmeAccess";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { sessionCohortId } from "@/lib/server/sessionCohortAccess";

const SHIPPED = new Set(["submitted", "reviewed", "shortlisted", "winner", "passed"]);
const ASSIGNMENT_IN = new Set(["submitted", "reviewed", "approved"]);

export type CohortCompletionMember = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  userStatus: string;
  sessionsAttended: number;
  sessionsRequired: number;
  attendedSessionIds: string[];
  assignmentCount: number;
  hasAssignment: boolean;
  projectStatus: string | null;
  projectTitle: string | null;
  hasShippedProject: boolean;
  meetsAttendance: boolean;
  meetsAssignment: boolean;
  meetsProject: boolean;
  meetsAttendanceAndWork: boolean;
  meetsAll: boolean;
};

export type CohortCompletionReport = {
  cohortId: string;
  notes: string[];
  attendanceCollection: string;
  minSessions: number;
  excludeCancelled: boolean;
  excludeUpcoming: boolean;
  sessions: {
    id: string;
    title: string;
    date: string;
    counted: boolean;
    cancelled: boolean;
    upcoming: boolean;
  }[];
  countedSessionIds: string[];
  countedSessionCount: number;
  summary: {
    members: number;
    meetsAttendance: number;
    meetsAssignment: number;
    meetsProject: number;
    meetsAttendanceAndWork: number;
    meetsAll: number;
  };
  members: CohortCompletionMember[];
};

function isCancelledSession(title: string, tags: unknown): boolean {
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : [];
  return tagList.includes("cancelled") || /cancelled/i.test(title);
}

function sessionStartMs(date: string): number | null {
  const t = Date.parse(`${date} 12:00:00 GMT`);
  return Number.isNaN(t) ? null : t;
}

function isUpcoming(date: string, now = Date.now()): boolean {
  const start = sessionStartMs(date);
  if (start == null) return false;
  const startDay = Date.parse(
    new Date(start).toISOString().slice(0, 10) + "T00:00:00.000Z"
  );
  const nowDay = Date.parse(new Date(now).toISOString().slice(0, 10) + "T00:00:00.000Z");
  return startDay > nowDay;
}

function attendedFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

export async function buildCohortCompletionReport(opts?: {
  cohortId?: string;
  minSessions?: number;
  excludeCancelled?: boolean;
  excludeUpcoming?: boolean;
  includeStaff?: boolean;
}): Promise<CohortCompletionReport> {
  const cohortId = (opts?.cohortId || (await resolveActiveCohortIdFromDb())).trim();
  const minSessions = Math.min(Math.max(opts?.minSessions ?? 6, 1), 20);
  const excludeCancelled = opts?.excludeCancelled !== false;
  const excludeUpcoming = opts?.excludeUpcoming !== false;
  const includeStaff = opts?.includeStaff === true;

  const db = adminDb();
  const [sessionSnap, userSnap, assignmentSnap, byHack, byCohort, attendanceSnap] =
    await Promise.all([
      db.collection("sessions").get(),
      db.collection("users").where("cohortIds", "array-contains", cohortId).get(),
      db.collection("assignments").get(),
      db.collection("projects").where("hackathonId", "==", DEVCAMP_HACKATHON_ID).get(),
      db.collection("projects").where("cohortId", "==", cohortId).get(),
      db.collection("attendance").get(),
    ]);

  const sessions = sessionSnap.docs
    .map((d) => {
      const data = d.data();
      const title = String(data.title ?? "");
      const date = String(data.date ?? "");
      const cancelled = isCancelledSession(title, data.tags);
      const upcoming = isUpcoming(date);
      const inCohort =
        sessionCohortId(data) === cohortId ||
        (typeof data.cohortId === "string" && data.cohortId === cohortId);
      return {
        id: d.id,
        title,
        date,
        number: Number(data.number) || 0,
        cancelled,
        upcoming,
        inCohort,
      };
    })
    .filter((s) => s.inCohort)
    .sort((a, b) => a.number - b.number || a.date.localeCompare(b.date));

  const sessionMeta = sessions.map((s) => {
    const counted =
      (!excludeCancelled || !s.cancelled) && (!excludeUpcoming || !s.upcoming);
    return {
      id: s.id,
      title: s.title,
      date: s.date,
      counted,
      cancelled: s.cancelled,
      upcoming: s.upcoming,
    };
  });
  const countedSessionIds = sessionMeta.filter((s) => s.counted).map((s) => s.id);

  const assignmentCount = new Map<string, number>();
  for (const d of assignmentSnap.docs) {
    const data = d.data();
    const uid = String(data.userId || "");
    if (!uid) continue;
    const status = String(data.status || "submitted");
    if (!ASSIGNMENT_IN.has(status)) continue;
    assignmentCount.set(uid, (assignmentCount.get(uid) ?? 0) + 1);
  }

  type Proj = { title: string; status: string };
  const projectByUid = new Map<string, Proj>();
  const rank = (status: string) => (SHIPPED.has(status) ? 2 : status === "draft" ? 1 : 0);
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    const data = d.data();
    const uid = String(data.userId || "");
    if (!uid) continue;
    const next: Proj = {
      title: String(data.title || ""),
      status: String(data.status || "draft"),
    };
    const prev = projectByUid.get(uid);
    if (!prev || rank(next.status) > rank(prev.status)) {
      projectByUid.set(uid, next);
    }
  }

  const membersRaw = userSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: String(data.email || ""),
        displayName: String(data.displayName || ""),
        role: String(data.role || "attendee"),
        userStatus: String(data.userStatus || "pending"),
        programOptOut: data.programOptOut === true,
        accountDisabled: data.accountDisabled === true,
      };
    })
    .filter((u) => {
      if (u.programOptOut || u.accountDisabled) return false;
      if (!includeStaff && isStaffRole(u.role)) return false;
      return true;
    });

  const attendanceByUid = new Map(
    attendanceSnap.docs.map((d) => [d.id, d.data() as Record<string, unknown>])
  );

  const members: CohortCompletionMember[] = membersRaw.map((u) => {
    const att = attendanceByUid.get(u.uid) || {};
    const attendedSessionIds = countedSessionIds.filter((id) => attendedFlag(att[id]));
    const sessionsAttended = attendedSessionIds.length;
    const aCount = assignmentCount.get(u.uid) ?? 0;
    const project = projectByUid.get(u.uid) ?? null;
    const hasAssignment = aCount > 0;
    const hasShippedProject = project ? SHIPPED.has(project.status) : false;
    const meetsAttendance = sessionsAttended >= minSessions;
    const meetsAssignment = hasAssignment;
    const meetsProject = hasShippedProject;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      userStatus: u.userStatus,
      sessionsAttended,
      sessionsRequired: minSessions,
      attendedSessionIds,
      assignmentCount: aCount,
      hasAssignment,
      projectStatus: project?.status ?? null,
      projectTitle: project?.title ?? null,
      hasShippedProject,
      meetsAttendance,
      meetsAssignment,
      meetsProject,
      meetsAttendanceAndWork: meetsAttendance && meetsAssignment,
      meetsAll: meetsAttendance && meetsAssignment && meetsProject,
    };
  });

  members.sort((a, b) => {
    if (a.meetsAll !== b.meetsAll) return a.meetsAll ? -1 : 1;
    if (a.meetsAttendanceAndWork !== b.meetsAttendanceAndWork) {
      return a.meetsAttendanceAndWork ? -1 : 1;
    }
    return (a.displayName || a.email).localeCompare(b.displayName || b.email);
  });

  return {
    cohortId,
    notes: [
      "Attendance is Firestore attendance/{uid} (per-session booleans from self check-in and admin marks). users.registeredSessions is unused and always empty — do not treat that as missing attendance.",
      "Weekly labs live in assignments/. Final / hackathon entries live in projects/ tagged with this cohortId and hackathonId.",
    ],
    attendanceCollection: "attendance",
    minSessions,
    excludeCancelled,
    excludeUpcoming,
    sessions: sessionMeta,
    countedSessionIds,
    countedSessionCount: countedSessionIds.length,
    summary: {
      members: members.length,
      meetsAttendance: members.filter((m) => m.meetsAttendance).length,
      meetsAssignment: members.filter((m) => m.meetsAssignment).length,
      meetsProject: members.filter((m) => m.meetsProject).length,
      meetsAttendanceAndWork: members.filter((m) => m.meetsAttendanceAndWork).length,
      meetsAll: members.filter((m) => m.meetsAll).length,
    },
    members,
  };
}
