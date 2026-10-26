/**
 * GET  /api/admin/hackathon — all programme/hackathon projects + voting settings
 * PATCH /api/admin/hackathon — { votingOpen?: boolean, votingMessage?: string }
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { toPublicProjectCard } from "@/lib/server/programmeProjects";

const patchSchema = z.object({
  votingOpen: z.boolean().optional(),
  votingMessage: z.string().max(500).optional(),
  winnersAnnounced: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId = await resolveActiveCohortIdFromDb();
    const db = adminDb();

    const [byHack, byCohort, settingsSnap, usersSnap] = await Promise.all([
      db.collection("projects").where("hackathonId", "==", DEVCAMP_HACKATHON_ID).get(),
      db.collection("projects").where("cohortId", "==", cohortId).get(),
      db.collection("hackathonSettings").doc("main").get(),
      db.collection("users").get(),
    ]);

    const emailByUid = new Map<string, string>();
    for (const u of usersSnap.docs) {
      const d = u.data();
      if (typeof d.email === "string") emailByUid.set(u.id, d.email);
    }

    const map = new Map<string, Record<string, unknown>>();
    for (const d of [...byHack.docs, ...byCohort.docs]) {
      const data = d.data();
      const pub = toPublicProjectCard(d.id, data);
      map.set(d.id, {
        ...pub,
        userId: data.userId,
        userEmail: emailByUid.get(String(data.userId)) || null,
        weekCompleted: Number(data.weekCompleted) || null,
        submittedAtClient:
          typeof data.submittedAtClient === "string" ? data.submittedAtClient : null,
      });
    }

    const projects = [...map.values()].sort((a, b) => {
      const va = Number(a.voteTotal) || 0;
      const vb = Number(b.voteTotal) || 0;
      if (vb !== va) return vb - va;
      return String(a.title).localeCompare(String(b.title));
    });

    const settings = settingsSnap.data() || {};
    return ok({
      cohortId,
      hackathonId: DEVCAMP_HACKATHON_ID,
      count: projects.length,
      projects,
      settings: {
        votingOpen: settings.votingOpen === true,
        winnersAnnounced: settings.winnersAnnounced === true,
        votingMessage:
          typeof settings.votingMessage === "string" ? settings.votingMessage : "",
      },
    });
  } catch (e) {
    logServerRouteException("GET /api/admin/hackathon", e);
    return err("Failed to load hackathon admin data", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    if (
      body.votingOpen === undefined &&
      body.votingMessage === undefined &&
      body.winnersAnnounced === undefined
    ) {
      return err("No fields to update", 400);
    }

    const payload: Record<string, unknown> = {
      hackathonId: DEVCAMP_HACKATHON_ID,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    };
    if (body.votingOpen !== undefined) payload.votingOpen = body.votingOpen;
    if (body.votingMessage !== undefined) payload.votingMessage = body.votingMessage;
    if (body.winnersAnnounced !== undefined) {
      payload.winnersAnnounced = body.winnersAnnounced;
    }

    await adminDb().collection("hackathonSettings").doc("main").set(payload, { merge: true });
    return ok({ updated: true, ...body });
  } catch (e) {
    logServerRouteException("PATCH /api/admin/hackathon", e);
    return err("Failed to update hackathon settings", 500);
  }
}
