/**
 * Day-of hackathon ops (Admin SDK). Used by MCP admin tools and /api/admin/hackathon.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { isStaffRole } from "@/lib/access/programmeAccess";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { readHackathonSettings } from "@/lib/server/hackathonSettings";
import { toPublicProjectCard } from "@/lib/server/programmeProjects";
import { AdminOpError } from "@/lib/server/admin/errors";
import { serializeDoc } from "@/lib/server/admin/serialize";

export const PROJECT_STATUSES = [
  "draft",
  "submitted",
  "reviewed",
  "shortlisted",
  "winner",
  "passed",
  "failed",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type HackathonBoardRow = {
  id: string;
  title: string;
  teamName: string;
  description: string;
  status: string;
  voteTotal: number;
  projectType: string;
  openToMembers: boolean;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  organiser: boolean;
  prizeEligible: boolean;
  cohortId?: string;
  hackathonId?: string;
};

async function loadEmailAndRoleMaps() {
  const usersSnap = await adminDb().collection("users").get();
  const emailByUid = new Map<string, string>();
  const roleByUid = new Map<string, string>();
  for (const u of usersSnap.docs) {
    const d = u.data();
    if (typeof d.email === "string") emailByUid.set(u.id, d.email);
    roleByUid.set(u.id, String(d.role || "attendee"));
  }
  return { emailByUid, roleByUid };
}

export async function listHackathonProjects(cohortId?: string): Promise<HackathonBoardRow[]> {
  const live = cohortId || (await resolveActiveCohortIdFromDb());
  const db = adminDb();
  const [byHack, byCohort, maps] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", DEVCAMP_HACKATHON_ID).get(),
    db.collection("projects").where("cohortId", "==", live).get(),
    loadEmailAndRoleMaps(),
  ]);
  const map = new Map<string, HackathonBoardRow>();
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    const data = d.data();
    const pub = toPublicProjectCard(d.id, data);
    const role = maps.roleByUid.get(pub.userId) || "attendee";
    const organiser = isStaffRole(role);
    map.set(d.id, {
      id: pub.id,
      title: pub.title,
      teamName: pub.teamName,
      description: pub.description.slice(0, 280),
      status: pub.status,
      voteTotal: pub.voteTotal,
      projectType: pub.projectType,
      openToMembers: pub.openToMembers,
      techStack: pub.techStack,
      githubUrl: pub.githubUrl,
      demoUrl: pub.demoUrl,
      userId: pub.userId,
      userName: pub.userName,
      userEmail: maps.emailByUid.get(pub.userId) || null,
      organiser,
      prizeEligible: !organiser && pub.status !== "draft",
      cohortId: pub.cohortId,
      hackathonId: pub.hackathonId,
    });
  }
  return [...map.values()].sort((a, b) => {
    if (b.voteTotal !== a.voteTotal) return b.voteTotal - a.voteTotal;
    return a.title.localeCompare(b.title);
  });
}

export async function recomputeAllHackathonVoteTotals(): Promise<number> {
  const db = adminDb();
  const votes = await db
    .collection("hackathonVotes")
    .where("hackathonId", "==", DEVCAMP_HACKATHON_ID)
    .get();
  const totals = new Map<string, number>();
  const voters = new Set<string>();
  for (const d of votes.docs) {
    const data = d.data();
    const pid = String(data.projectId || "");
    const uid = String(data.userId || "");
    const n = Number(data.voteCount) || 0;
    if (pid && n > 0) totals.set(pid, (totals.get(pid) ?? 0) + n);
    if (uid) voters.add(uid);
  }
  const projects = await listHackathonProjects();
  for (const p of projects) {
    const total = totals.get(p.id) ?? 0;
    await db.collection("projects").doc(p.id).set(
      {
        voteTotal: total,
        voteTotalRecomputedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
  return voters.size;
}

export async function buildHackathonBoard() {
  const [settings, projects, voteSnap] = await Promise.all([
    readHackathonSettings(),
    listHackathonProjects(),
    adminDb()
      .collection("hackathonVotes")
      .where("hackathonId", "==", DEVCAMP_HACKATHON_ID)
      .get(),
  ]);

  const voters = new Set<string>();
  let ballotVotes = 0;
  for (const d of voteSnap.docs) {
    const data = d.data();
    const n = Number(data.voteCount) || 0;
    if (n > 0) {
      ballotVotes += n;
      if (data.userId) voters.add(String(data.userId));
    }
  }

  const byStatus: Record<string, number> = {};
  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  const shipped = projects.filter((p) => p.status !== "draft");
  const eligible = shipped.filter((p) => p.prizeEligible);
  const leaderboard = eligible.slice(0, 15).map((p, i) => ({
    rank: i + 1,
    id: p.id,
    title: p.title,
    voteTotal: p.voteTotal,
    status: p.status,
    userEmail: p.userEmail,
  }));
  const winners = projects.filter((p) => p.status === "winner");

  return {
    hackathonId: DEVCAMP_HACKATHON_ID,
    settings,
    counts: {
      projects: projects.length,
      shipped: shipped.length,
      drafts: byStatus.draft ?? 0,
      voters: voters.size,
      ballotVotes,
      byStatus,
    },
    leaderboard,
    winners: winners.map((p) => ({
      id: p.id,
      title: p.title,
      voteTotal: p.voteTotal,
      userEmail: p.userEmail,
      organiser: p.organiser,
    })),
    note: "Organisers/speakers are prize-ineligible. Audience ranking uses voteTotal on shipped non-organiser projects. Use admin_set_project_status to mark winner/shortlisted.",
    projects,
  };
}

export async function listHackathonProjectsFiltered(opts?: {
  cohortId?: string;
  userId?: string;
  status?: string;
  limit?: number;
}) {
  const live = opts?.cohortId || (await resolveActiveCohortIdFromDb());
  const cap = Math.min(Math.max(opts?.limit ?? 300, 1), 500);
  let projects = await listHackathonProjects(live);
  if (opts?.userId) projects = projects.filter((p) => p.userId === opts.userId);
  if (opts?.status) projects = projects.filter((p) => p.status === opts.status);
  projects = projects.slice(0, cap);
  return {
    cohortId: live,
    hackathonId: DEVCAMP_HACKATHON_ID,
    count: projects.length,
    projects,
  };
}

export async function recomputeHackathonVotesAndBoard() {
  const voters = await recomputeAllHackathonVoteTotals();
  const board = await buildHackathonBoard();
  return { recomputed: true, voters, leaderboard: board.leaderboard };
}

export async function patchAdminProject(
  projectId: string,
  fields: { status?: ProjectStatus; feedback?: string }
): Promise<Record<string, unknown>> {
  const ref = adminDb().collection("projects").doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new AdminOpError(`Project not found: ${projectId}`, 404);
  if (fields.status === undefined && fields.feedback === undefined) {
    throw new AdminOpError("Provide status and/or feedback", 400);
  }
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.feedback !== undefined) update.feedback = fields.feedback;
  await ref.set(update, { merge: true });
  const updated = await ref.get();
  return serializeDoc(updated.id, updated.data()!);
}

export async function setHackathonProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<Record<string, unknown>> {
  return patchAdminProject(projectId, { status });
}
