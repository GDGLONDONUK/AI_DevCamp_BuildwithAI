/**
 * Shared learning-tool executors for HTTP chat and DevCamp MCP.
 * No `server-only` — safe for Node MCP / scripts.
 */

import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";
import type { LearningChatContext } from "@/lib/learning-chat/constants";
import {
  getSessionById,
  listMaterialsForSession,
  listSessionsForCohort,
  searchLearningMaterials,
} from "@/lib/learning-chat/materialsRepoCore";

/** Session fields safe for the learning assistant (no PII beyond public speaker names). */
export function publicSessionPayload(session: Awaited<ReturnType<typeof getSessionById>>) {
  if (!session) return null;
  return {
    id: session.id,
    number: session.number,
    title: session.title,
    date: session.date,
    time: session.time,
    week: session.week,
    topic: session.topic,
    description: session.description,
    whatYouWillLearn: session.whatYouWillLearn,
    buildIdeas: session.buildIdeas,
    resources: session.resources,
    videoUrl: session.videoUrl,
    resourcesFolderUrl: session.resourcesFolderUrl,
    isKickoff: session.isKickoff,
    isClosing: session.isClosing,
    /** Public roster names only — never emails or user profile ids. */
    speakers: (session.speakers || []).map((s) => ({
      name: s.name,
      title: s.title,
    })),
    speakerIds: session.speakerIds,
  };
}

export async function execListCohortSessions(ctx: Pick<LearningChatContext, "cohortId">) {
  const sessions = await listSessionsForCohort(ctx.cohortId);
  return {
    cohortId: ctx.cohortId,
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      date: s.date,
      time: s.time,
      week: s.week,
      topic: s.topic,
      isKickoff: s.isKickoff,
      isClosing: s.isClosing,
      hasVideo: Boolean(s.videoUrl),
      resourceCount: s.resources?.length ?? 0,
    })),
  };
}

export async function execGetSessionDetail(
  ctx: Pick<LearningChatContext, "cohortId">,
  sessionId: string
) {
  const session = await getSessionById(sessionId);
  if (!session) return { error: `Session not found: ${sessionId}` };
  const sessionCohort = session.cohortId || SPRING_2026_COHORT_ID;
  if (sessionCohort !== ctx.cohortId) {
    return { error: "Session is not in the active cohort." };
  }
  return publicSessionPayload(session);
}

export async function execSearchSessionMaterials(
  ctx: Pick<LearningChatContext, "cohortId" | "focusSessionId">,
  opts: {
    query: string;
    sessionId?: string;
    kind?: string;
    limit?: number;
  }
) {
  const hits = await searchLearningMaterials({
    cohortId: ctx.cohortId,
    query: opts.query,
    sessionId: opts.sessionId || ctx.focusSessionId,
    kind: opts.kind,
    limit: opts.limit,
  });
  return {
    query: opts.query,
    hitCount: hits.length,
    results: hits.map((h) => ({
      materialId: h.id,
      title: h.title,
      kind: h.kind,
      sessionId: h.sessionId,
      sessionTitle: h.sessionTitle,
      concepts: h.concepts,
      url: h.url,
      score: h.score,
      excerpt: h.excerpt,
    })),
  };
}

export async function execListSessionMaterials(
  ctx: Pick<LearningChatContext, "cohortId">,
  sessionId: string
) {
  const session = await getSessionById(sessionId);
  if (!session) return { error: `Session not found: ${sessionId}` };
  const sessionCohort = session.cohortId || SPRING_2026_COHORT_ID;
  if (sessionCohort !== ctx.cohortId) {
    return { error: "Session is not in the active cohort." };
  }
  const materials = (await listMaterialsForSession(sessionId)).filter(
    (m) => m.cohortId === ctx.cohortId
  );
  return {
    sessionId,
    count: materials.length,
    materials: materials.map((m) => ({
      id: m.id,
      title: m.title,
      kind: m.kind,
      url: m.url,
      concepts: m.concepts,
      textPreview: m.textContent.slice(0, 280),
    })),
  };
}

export function execGetFocusHint(ctx: LearningChatContext) {
  return {
    focusSessionId: ctx.focusSessionId ?? null,
    pathname: ctx.pathname ?? null,
    cohortId: ctx.cohortId,
  };
}
