/**
 * GET  /api/hackathon/vote — voteable projects + caller's allocations + settings
 * POST /api/hackathon/vote — cast allocations { allocations: { [projectId]: count } }
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import {
  listVoteableProjects,
  listPublicHackathonIdeas,
  bumpProjectVoteTotal,
} from "@/lib/server/programmeProjects";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";

const VOTE_BUDGET_ORGANISER = 10;
const VOTE_BUDGET_PARTICIPANT = 5;
const VOTE_MAX_PER_PROJECT = 2;

const castSchema = z.object({
  allocations: z.record(z.string().min(1).max(128), z.number().int().min(0).max(VOTE_MAX_PER_PROJECT)),
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
  // Default closed until admin sets votingOpen: true on hackathonSettings/main.
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
    // Always show gallery on the vote screen (incl. drafts) so the page is not empty
    // when voting is closed; casting still restricted to shipped projects in POST.
    const byId = new Map(gallery.map((p) => [p.id, p]));
    for (const p of voteable) byId.set(p.id, p);
    return ok({
      projects: [...byId.values()].sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
      voteableIds: voteable.map((p) => p.id),
      ...settings,
      allocations,
      budget: budgetForRole(auth.role),
      maxPerProject: VOTE_MAX_PER_PROJECT,
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
    const settings = await readVotingSettings();
    if (!settings.votingOpen) {
      return err(settings.message || "Voting is closed", 403);
    }

    const parsed = await parseJsonBody(req, castSchema);
    if (!parsed.ok) return parsed.response;
    const next = parsed.data.allocations;

    const budget = budgetForRole(auth.role);
    const used = Object.values(next).reduce((s, n) => s + n, 0);
    if (used > budget) {
      return err(`You only have ${budget} votes to allocate`, 400);
    }

    const cohortId = await resolveActiveCohortIdFromDb();
    const voteable = await listVoteableProjects(cohortId);
    const allowed = new Set(voteable.map((p) => p.id));
    for (const pid of Object.keys(next)) {
      if (next[pid] > 0 && !allowed.has(pid)) {
        return err(`Project not voteable: ${pid}`, 400);
      }
    }

    const prev = await loadUserVotes(auth.uid);
    const db = adminDb();
    const batch = db.batch();
    const deltas: Array<{ projectId: string; delta: number }> = [];

    const allIds = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const projectId of allIds) {
      const before = prev[projectId] || 0;
      const after = next[projectId] || 0;
      const delta = after - before;
      const voteDocId = `${DEVCAMP_HACKATHON_ID}_${auth.uid}_${projectId}`;
      const voteRef = db.collection("hackathonVotes").doc(voteDocId);

      if (after <= 0) {
        batch.delete(voteRef);
      } else {
        batch.set(voteRef, {
          userId: auth.uid,
          projectId,
          voteCount: after,
          hackathonId: DEVCAMP_HACKATHON_ID,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      if (delta !== 0) deltas.push({ projectId, delta });
    }

    await batch.commit();
    for (const { projectId, delta } of deltas) {
      await bumpProjectVoteTotal(projectId, delta);
    }

    return ok({
      ok: true,
      allocations: Object.fromEntries(
        Object.entries(next).filter(([, n]) => n > 0)
      ),
      used,
      remaining: budget - used,
    });
  } catch (e) {
    logServerRouteException("POST /api/hackathon/vote", e);
    return err("Failed to cast votes", 500);
  }
}
