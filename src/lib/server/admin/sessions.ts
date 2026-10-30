/**
 * Admin session list/upsert. Call only after requireAdmin for writes.
 * GET list is used by both public /api/sessions and admin MCP (filter in caller).
 */

import { adminDb } from "@/lib/firebase-admin";
import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";
import { AdminOpError } from "@/lib/server/admin/errors";
import { serializeDoc } from "@/lib/server/admin/serialize";

export async function listSessions(opts?: {
  cohortId?: string;
  allCohorts?: boolean;
}) {
  const snap = await adminDb().collection("sessions").orderBy("number", "asc").get();
  let sessions = snap.docs.map((d) => serializeDoc(d.id, d.data()));
  if (!opts?.allCohorts) {
    const cid = opts?.cohortId;
    if (cid) {
      sessions = sessions.filter(
        (s) =>
          (s.cohortId as string | undefined) === cid ||
          (!s.cohortId && cid === SPRING_2026_COHORT_ID)
      );
    }
  }
  return { count: sessions.length, sessions };
}

const SESSION_KEYS = new Set([
  "title",
  "number",
  "date",
  "time",
  "duration",
  "week",
  "topic",
  "description",
  "cohortId",
  "videoUrl",
  "resourcesFolderUrl",
  "isKickoff",
  "isClosing",
  "whatYouWillLearn",
  "buildIdeas",
  "resources",
  "speakerIds",
  "speakers",
  "speaker",
  "speakerTitle",
  "speakerPhoto",
  "tags",
]);

export async function upsertSession(opts: {
  id: string;
  fields: Record<string, unknown>;
  merge?: boolean;
  defaultCohortId?: string;
}) {
  const id = opts.id.trim();
  if (!id) throw new AdminOpError("Session id is required", 400);
  const merge = opts.merge !== false;
  const ref = adminDb().collection("sessions").doc(id);
  const existing = await ref.get();
  const now = new Date().toISOString();

  const cleaned = Object.fromEntries(
    Object.entries(opts.fields).filter(
      ([k, v]) => v !== undefined && SESSION_KEYS.has(k)
    )
  );

  if (!existing.exists) {
    if (!cleaned.title || typeof cleaned.number !== "number") {
      throw new AdminOpError("New session requires title and number", 400);
    }
    const payload = {
      ...cleaned,
      id,
      createdAt: now,
      updatedAt: now,
      cohortId: cleaned.cohortId || opts.defaultCohortId,
    };
    await ref.set(payload);
  } else if (merge) {
    await ref.set({ ...cleaned, id, updatedAt: now }, { merge: true });
  } else {
    await ref.set({ ...existing.data(), ...cleaned, id, updatedAt: now });
  }

  const updated = await ref.get();
  return serializeDoc(updated.id, updated.data()!);
}
