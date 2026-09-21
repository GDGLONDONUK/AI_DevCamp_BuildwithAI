import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";
import type { LearningChatContext } from "@/lib/learning-chat/constants";
import {
  getSessionById,
  listMaterialsForSession,
  listSessionsForCohort,
  searchLearningMaterials,
} from "@/lib/learning-chat/materialsRepo";

/** Session fields safe for the learning assistant (no PII beyond public speaker names). */
function publicSessionPayload(session: Awaited<ReturnType<typeof getSessionById>>) {
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

export function buildLearningChatTools(ctx: LearningChatContext) {
  return {
    list_cohort_sessions: tool({
      description:
        "List programme sessions for the active cohort (titles, dates, topics, weeks). Use for schedule overview. Does NOT return user or attendance data.",
      inputSchema: z.object({}),
      execute: async () => {
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
      },
    }),

    get_session_detail: tool({
      description:
        "Get session learning content: description, outcomes, build ideas, public resources, video URL, speaker names. Cohort-scoped only.",
      inputSchema: z.object({
        sessionId: z.string().min(1).describe("Firestore sessions document id"),
      }),
      execute: async ({ sessionId }) => {
        const session = await getSessionById(sessionId);
        if (!session) return { error: `Session not found: ${sessionId}` };
        const sessionCohort = session.cohortId || SPRING_2026_COHORT_ID;
        if (sessionCohort !== ctx.cohortId) {
          return { error: "Session is not in the active cohort." };
        }
        return publicSessionPayload(session);
      },
    }),

    search_session_materials: tool({
      description:
        "RAG search over programme materials (PDFs, transcripts, videos, concepts, session summaries) for the active cohort only. Never searches users or personal tasks.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
        sessionId: z
          .string()
          .optional()
          .describe("Limit search to one session id when known"),
        kind: z
          .enum([
            "session_summary",
            "transcript",
            "pdf",
            "video",
            "slides",
            "concept",
            "notes",
            "resource",
          ])
          .optional(),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ query, sessionId, kind, limit }) => {
        const hits = await searchLearningMaterials({
          cohortId: ctx.cohortId,
          query,
          sessionId: sessionId || ctx.focusSessionId,
          kind,
          limit,
        });
        return {
          query,
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
      },
    }),

    list_session_materials: tool({
      description:
        "List programme learning materials (PDF, transcript, video, concepts) for one session in the active cohort.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
      }),
      execute: async ({ sessionId }) => {
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
      },
    }),

    get_focus_hint: tool({
      description:
        "Return the UI focus session id and page path only (no user profile fields).",
      inputSchema: z.object({}),
      execute: async () => ({
        focusSessionId: ctx.focusSessionId ?? null,
        pathname: ctx.pathname ?? null,
        cohortId: ctx.cohortId,
      }),
    }),
  };
}
