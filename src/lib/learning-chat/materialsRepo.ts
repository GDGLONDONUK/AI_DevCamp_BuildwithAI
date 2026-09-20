import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";
import { SESSION_LEARNING_MATERIALS_COLLECTION } from "@/lib/learning-chat/constants";
import type { Session, SessionLearningMaterial } from "@/types";

function scoreText(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const t of tokens) {
    if (h.includes(t)) score += 1;
  }
  return score;
}

export async function listSessionsForCohort(cohortId: string): Promise<Session[]> {
  const snap = await adminDb().collection("sessions").get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) }));
  return rows
    .filter((s) => (s.cohortId || SPRING_2026_COHORT_ID) === cohortId)
    .sort((a, b) => (a.number || 0) - (b.number || 0));
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const snap = await adminDb().collection("sessions").doc(sessionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Session, "id">) };
}

function materialFromDoc(
  id: string,
  data: Record<string, unknown>
): SessionLearningMaterial {
  return {
    id,
    sessionId: String(data.sessionId || ""),
    cohortId: String(data.cohortId || ""),
    title: String(data.title || id),
    kind: (data.kind as SessionLearningMaterial["kind"]) || "notes",
    textContent: String(data.textContent || ""),
    url: typeof data.url === "string" ? data.url : undefined,
    concepts: Array.isArray(data.concepts)
      ? data.concepts.filter((c): c is string => typeof c === "string")
      : undefined,
    week: typeof data.week === "number" ? data.week : undefined,
    sessionTitle: typeof data.sessionTitle === "string" ? data.sessionTitle : undefined,
    sessionTopic: typeof data.sessionTopic === "string" ? data.sessionTopic : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function listMaterialsForCohort(
  cohortId: string
): Promise<SessionLearningMaterial[]> {
  const snap = await adminDb()
    .collection(SESSION_LEARNING_MATERIALS_COLLECTION)
    .where("cohortId", "==", cohortId)
    .get();
  return snap.docs.map((d) => materialFromDoc(d.id, d.data() as Record<string, unknown>));
}

export async function listMaterialsForSession(
  sessionId: string
): Promise<SessionLearningMaterial[]> {
  const snap = await adminDb()
    .collection(SESSION_LEARNING_MATERIALS_COLLECTION)
    .where("sessionId", "==", sessionId)
    .get();
  return snap.docs.map((d) => materialFromDoc(d.id, d.data() as Record<string, unknown>));
}

export async function searchLearningMaterials(opts: {
  cohortId: string;
  query: string;
  sessionId?: string;
  kind?: string;
  limit?: number;
}): Promise<
  Array<SessionLearningMaterial & { score: number; excerpt: string }>
> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 12);
  let materials = opts.sessionId
    ? await listMaterialsForSession(opts.sessionId)
    : await listMaterialsForCohort(opts.cohortId);

  materials = materials.filter((m) => m.cohortId === opts.cohortId || !opts.sessionId);
  if (opts.kind) {
    materials = materials.filter((m) => m.kind === opts.kind);
  }

  const scored = materials
    .map((m) => {
      const blob = [
        m.title,
        m.sessionTitle,
        m.sessionTopic,
        ...(m.concepts || []),
        m.textContent,
      ].join("\n");
      const score = scoreText(blob, opts.query);
      const lower = m.textContent.toLowerCase();
      const q = opts.query.toLowerCase().split(/\s+/).find((t) => t.length > 3);
      let excerpt = m.textContent.slice(0, 500);
      if (q) {
        const idx = lower.indexOf(q);
        if (idx >= 0) {
          const start = Math.max(0, idx - 80);
          excerpt = m.textContent.slice(start, start + 500);
        }
      }
      return { ...m, score, excerpt };
    })
    .filter((m) => m.score > 0 || !opts.query.trim())
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  if (scored.length === 0 && materials.length > 0) {
    return materials.slice(0, limit).map((m) => ({
      ...m,
      score: 0,
      excerpt: m.textContent.slice(0, 500),
    }));
  }

  return scored;
}

export async function upsertLearningMaterial(
  material: Omit<SessionLearningMaterial, "id" | "updatedAt" | "updatedByUid"> & {
    id?: string;
  },
  updatedByUid: string
): Promise<SessionLearningMaterial> {
  const id =
    material.id ||
    `${material.sessionId}_${material.kind}_${Date.now().toString(36)}`;
  const updatedAt = new Date().toISOString();
  const payload: SessionLearningMaterial = {
    ...material,
    id,
    updatedAt,
    updatedByUid,
  };
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );
  await adminDb()
    .collection(SESSION_LEARNING_MATERIALS_COLLECTION)
    .doc(id)
    .set(cleaned, { merge: true });
  return payload;
}
