/**
 * Admin user reads/writes. Call only after requireAdmin (HTTP or MCP).
 */

import { FieldValue, type Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { findUserCohortProject } from "@/lib/server/programmeProjects";
import { AdminOpError } from "@/lib/server/admin/errors";
import { compactUser, serializeDoc } from "@/lib/server/admin/serialize";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";

export const USER_PRIVILEGED_FIELDS = [
  "role",
  "userStatus",
  "kickoffInPersonAdminConfirmed",
  "accountDisabled",
  "accountDisabledReason",
  "programOptOut",
  "programOptOutAt",
  "cohortIds",
  "activeCohortId",
  "cohortParticipation",
] as const;

export const USER_SELF_EDITABLE_FIELDS = [
  "displayName",
  "bio",
  "city",
  "country",
  "location",
  "linkedinUrl",
  "githubUrl",
  "websiteUrl",
  "websiteURL",
  "experienceLevel",
  "skills",
  "expertise",
  "wantToLearn",
  "canOffer",
  "handle",
  "keepUpdated",
  "roleTitle",
  "photoURL",
  "kickoffRsvpExplicitInApp",
  "profilePublic",
] as const;

export type ListAdminUsersOpts = {
  status?: string;
  search?: string;
  limit?: number;
  /** Defaults to live cohort. Pass "all" for every user. */
  cohortId?: string;
  compact?: boolean;
};

export async function listAdminUsers(opts: ListAdminUsersOpts = {}) {
  const cap = Math.min(Math.max(opts.limit ?? 1000, 1), 2000);
  const live = await resolveActiveCohortIdFromDb();
  const wantAll = opts.cohortId === "all";
  const cid = wantAll ? null : opts.cohortId || live;

  let query: Query = adminDb().collection("users");
  if (cid) query = query.where("cohortIds", "array-contains", cid);
  const snap = await query.get();

  let users = snap.docs.map((d) =>
    opts.compact ? compactUser(d.id, d.data()) : serializeDoc(d.id, d.data())
  );

  if (opts.status) {
    users = users.filter((u) => u.userStatus === opts.status);
  }
  const term = opts.search?.toLowerCase().trim();
  if (term) {
    users = users.filter((u) => {
      const name = String(u.displayName ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const handle = String(u.handle ?? "").toLowerCase();
      return name.includes(term) || email.includes(term) || handle.includes(term);
    });
  }

  users = users.slice(0, cap);
  return {
    count: users.length,
    cohortId: cid,
    note: "Attendance is not on the user doc. Use GET /api/attendance/[uid] or admin_get_attendance.",
    users,
  };
}

export async function getAdminUser(uidOrEmail: string) {
  const snap = await resolveUserDoc(uidOrEmail);
  if (!snap?.exists) throw new AdminOpError(`User not found: ${uidOrEmail}`, 404);
  const data = snap.data()!;
  const live = await resolveActiveCohortIdFromDb();
  const [attSnap, project] = await Promise.all([
    adminDb().collection("attendance").doc(snap.id).get(),
    findUserCohortProject(snap.id, live),
  ]);
  const attendance = attSnap.exists ? serializeDoc(attSnap.id, attSnap.data()!) : {};
  const sessionKeys = Object.entries(attendance).filter(
    ([k, v]) =>
      k !== "id" && k !== "sessionAttendanceAudit" && k !== "updatedAt" && v === true
  );
  return {
    user: compactUser(snap.id, data),
    attendance,
    attendanceSessionCount: sessionKeys.length,
    attendedSessionIds: sessionKeys.map(([k]) => k),
    currentCohortId: live,
    project: project
      ? {
          id: project.id,
          title: project.title,
          status: project.status,
          cohortId: project.cohortId ?? null,
          hackathonId: project.hackathonId ?? null,
        }
      : null,
    note: "Attendance is attendance/{uid}. users.registeredSessions is unused.",
  };
}

export type ApplyUserPatchOpts = {
  actorIsAdmin: boolean;
  fields: Record<string, unknown>;
};

export async function applyUserPatch(uidOrEmail: string, opts: ApplyUserPatchOpts) {
  const snap = await resolveUserDoc(uidOrEmail);
  if (!snap?.exists) throw new AdminOpError(`User not found: ${uidOrEmail}`, 404);

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(opts.fields)) {
    if (value === undefined) continue;
    if ((USER_PRIVILEGED_FIELDS as readonly string[]).includes(key)) {
      if (!opts.actorIsAdmin) {
        throw new AdminOpError(`Only admins can update "${key}"`, 403);
      }
      update[key] = value;
    } else if ((USER_SELF_EDITABLE_FIELDS as readonly string[]).includes(key)) {
      update[key] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    throw new AdminOpError("No valid fields to update", 400);
  }

  if (update.programOptOut === true && update.programOptOutAt === undefined) {
    update.programOptOutAt = new Date().toISOString();
  }
  if (update.programOptOut === false) {
    update.programOptOutAt = FieldValue.delete();
  }

  update.updatedAt = FieldValue.serverTimestamp();
  await snap.ref.update(update);
  const updated = await snap.ref.get();
  return serializeDoc(updated.id, updated.data()!);
}
