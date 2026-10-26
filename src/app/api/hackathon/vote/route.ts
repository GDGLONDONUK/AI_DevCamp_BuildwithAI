/**
 * GET  /api/hackathon/vote — projects + caller's allocations + settings
 * POST /api/hackathon/vote — cast allocations (server-enforced anti-cheat)
 *
 * Guards:
 * - Auth + not opted-out (verifyAuth)
 * - Eligible hackathon / cohort participant (or staff)
 * - Voting window must be open (admin flag + optional opens/closes)
 * - Fixed budget; max votes per project; max distinct projects
 * - Cannot vote for your own project
 * - Only shipped (non-draft) projects
 * - Rate limit per uid
 * - voteTotal recomputed from hackathonVotes (not client-trusted)
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { isHackathonEligible } from "@/lib/hackathon/access";
import {
  listVoteableProjects,
  listPublicHackathonIdeas,
} from "@/lib/server/programmeProjects";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import {
  isHackathonVoteRateLimited,
  recordHackathonVoteCast,
} from "@/lib/server/hackathonVoteRateLimit";

const VOTE_BUDGET_ORGANISER = 10;
const VOTE_BUDGET_PARTICIPANT = 5;
const VOTE_MAX_PER_PROJECT = 2;
/** Hard cap on how many project keys a ballot may touch. */
const VOTE_MAX_PROJECTS = 20;

const castSchema = z.object({
  allocations: z
    .record(z.string().min(1).max(128), z.number().int().min(0).max(VOTE_MAX_PER_PROJECT))
    .refine((o) => Object.keys(o).length <= VOTE_MAX_PROJECTS, {
      message: `At most ${VOTE_MAX_PROJECTS} projects per ballot`,
    }),
});

function budgetForRole(role: string): number {
  return role === "admin" || role === "moderator"
    ? VOTE_BUDGET_ORGANISER
    : VOTE_BUDGET_PARTICIPANT;
}

async function readVotingSettings() {
  const snap = await adminDb().collection("hackathonSettings").doc("main").get();
  const data = snap.data() || {};
  const winnersAnnounced = data.winnersAnnounced === true;
  let votingOpen = data.votingOpen === true && !winnersAnnounced;
  let message: string | undefined =
    typeof data.votingMessage === "string" ? data.votingMessage : undefined;

  const opens = data.votingOpensAt?.toDate?.() as Date | undefined;
  const closes = data.votingClosesAt?.toDate?.() as Date | undefined;
  const now = Date.now();
  if (opens && now < opens.getTime()) {
    votingOpen = false;
    message = `Voting opens ${opens.toLocaleString("en-GB")}.`;
  }
  if (closes && now > closes.getTime()) {
    votingOpen = false;
    message = "Voting has closed.";
  }

  return { votingOpen, message, winnersAnnounced };
}

async function loadUserVotes(uid: string) {
  const snap = await adminDb()
    .collection("hackathonVotes")
    .where("userId", "==", uid)
    .where("hackathonId", "==", DEVCAMP_HACKATHON_ID)
    .get();
  const allocations: Record<string, number> = {};
  for (const d of snap.docs) {
    const data = d.data();
    const pid = String(data.projectId || "");
    const n = Number(data.voteCount) || 0;
    if (pid && n > 0) allocations[pid] = n;
  }
  return allocations;
}

/** Recompute voteTotal from ballot log so increments cannot drift / be gamed. */
async function recomputeVoteTotals(projectIds: string[]) {
  const db = adminDb();
  for (const projectId of projectIds) {
    const snap = await db
      .collection("hackathonVotes")
      .where("hackathonId", "==", DEVCAMP_HACKATHON_ID)
      .where("projectId", "==", projectId)
      .get();
    let total = 0;
    for (const d of snap.docs) {
      total += Number(d.data().voteCount) || 0;
    }
    await db.collection("projects").doc(projectId).set(
      {
        voteTotal: total,
        voteTotalRecomputedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function assertVoterEligible(uid: string, role: string) {
  const live = await resolveActiveCohortIdFromDb();
  const userSnap = await adminDb().collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("Profile not found");
  const data = userSnap.data() || {};
  if (data.accountDisabled === true) throw new Error("Account disabled");
  if (data.programOptOut === true) throw new Error("Programme opt-out");
  if (
    !isHackathonEligible(
      {
        cohortIds: data.cohortIds,
        hackathonParticipant: data.hackathonParticipant,
        role: data.role || role,
      },
      live
    )
  ) {
    throw new Error("Not eligible to vote — join the hackathon or active cohort first");
  }
  return { live, userData: data };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId = await resolveActiveCohortIdFromDb();
    const [voteable, gallery, settings, allocations] = await Promise.all([
      listVoteableProjects(cohortId),
      listPublicHackathonIdeas(cohortId),
      readVotingSettings(),
      loadUserVotes(auth.uid),
    ]);
    const byId = new Map(gallery.map((p) => [p.id, p]));
    for (const p of voteable) byId.set(p.id, p);
    const voteableIds = voteable
      .filter((p) => p.userId !== auth.uid)
      .map((p) => p.id);
    return ok({
      projects: [...byId.values()].sort((a, b) => a.title.localeCompare(b.title)),
      voteableIds,
      ownProjectIds: voteable.filter((p) => p.userId === auth.uid).map((p) => p.id),
      ...settings,
      allocations,
      budget: budgetForRole(auth.role),
      maxPerProject: VOTE_MAX_PER_PROJECT,
      rules: {
        noSelfVote: true,
        maxPerProject: VOTE_MAX_PER_PROJECT,
        budget: budgetForRole(auth.role),
        eligibleOnly: true,
      },
    });
  } catch (e) {
    logServerRouteException("GET /api/hackathon/vote", e);
    return err("Failed to load voting", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (isErrorResponse(auth)) return auth;

  try {
    if (isHackathonVoteRateLimited(auth.uid)) {
      return err("Too many vote updates — wait a minute and try again", 429);
    }

    const settings = await readVotingSettings();
    if (!settings.votingOpen) {
      return err(settings.message || "Voting is closed", 403);
    }

    try {
      await assertVoterEligible(auth.uid, auth.role);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Not eligible", 403);
    }

    const parsed = await parseJsonBody(req, castSchema);
    if (!parsed.ok) return parsed.response;
    const nextRaw = parsed.data.allocations;

    // Drop zero entries; normalize.
    const next: Record<string, number> = {};
    for (const [pid, n] of Object.entries(nextRaw)) {
      const count = Math.floor(Number(n));
      if (!Number.isFinite(count) || count <= 0) continue;
      if (count > VOTE_MAX_PER_PROJECT) {
        return err(`Max ${VOTE_MAX_PER_PROJECT} votes per project`, 400);
      }
      next[pid] = count;
    }

    const budget = budgetForRole(auth.role);
    const used = Object.values(next).reduce((s, n) => s + n, 0);
    if (used > budget) {
      return err(`You only have ${budget} votes to allocate`, 400);
    }
    if (Object.keys(next).length > VOTE_MAX_PROJECTS) {
      return err(`At most ${VOTE_MAX_PROJECTS} projects per ballot`, 400);
    }

    const cohortId = await resolveActiveCohortIdFromDb();
    const voteable = await listVoteableProjects(cohortId);
    const allowed = new Map(voteable.map((p) => [p.id, p]));

    for (const pid of Object.keys(next)) {
      const proj = allowed.get(pid);
      if (!proj) {
        return err(`Project not voteable: ${pid}`, 400);
      }
      if (proj.userId && proj.userId === auth.uid) {
        return err("You cannot vote for your own project", 400);
      }
    }

    const prev = await loadUserVotes(auth.uid);
    const db = adminDb();
    const batch = db.batch();
    const touched = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);

    for (const projectId of touched) {
      const before = prev[projectId] || 0;
      const after = next[projectId] || 0;
      const voteDocId = `${DEVCAMP_HACKATHON_ID}_${auth.uid}_${projectId}`;
      const voteRef = db.collection("hackathonVotes").doc(voteDocId);

      if (after <= 0) {
        if (before > 0) batch.delete(voteRef);
      } else {
        batch.set(voteRef, {
          userId: auth.uid,
          projectId,
          voteCount: after,
          hackathonId: DEVCAMP_HACKATHON_ID,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
    await recomputeVoteTotals([...touched]);
    recordHackathonVoteCast(auth.uid);

    // Persist last cast for audit (server-maintained field via Admin SDK).
    await db.collection("users").doc(auth.uid).set(
      {
        lastHackathonVoteAt: FieldValue.serverTimestamp(),
        lastHackathonVoteEdition: DEVCAMP_HACKATHON_ID,
      },
      { merge: true }
    );

    return ok({
      ok: true,
      allocations: next,
      used,
      remaining: budget - used,
    });
  } catch (e) {
    logServerRouteException("POST /api/hackathon/vote", e);
    return err("Failed to cast votes", 500);
  }
}
