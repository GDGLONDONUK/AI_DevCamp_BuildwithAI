import "server-only";

import { tool } from "ai";
import { z } from "zod";
import type { LearningChatContext } from "@/lib/learning-chat/constants";
import {
  getSessionById,
  listMaterialsForSession,
  listSessionsForCohort,
  searchLearningMaterials,
} from "@/lib/learning-chat/materialsRepo";

export function buildLearningChatTools(ctx: LearningChatContext) {
  return {
    list_cohort_sessions: tool({
      description:
        "List programme sessions for the active cohort (titles, dates, topics, weeks). Use when the user asks what sessions exist or for a schedule overview.",
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
        "Get full session metadata: description, learning outcomes, build ideas, resources, video URL, speakers.",
      inputSchema: z.object({
        sessionId: z.string().min(1).describe("Firestore sessions document id"),
      }),
      execute: async ({ sessionId }) => {
        const session = await getSessionById(sessionId);
        if (!session) return { error: `Session not found: ${sessionId}` };
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
          speakerIds: session.speakerIds,
          speakers: session.speakers,
        };
      },
    }),

    search_session_materials: tool({
      description:
        "RAG search over PDFs, transcripts, videos notes, concepts, and session summaries. Prefer this when answering what was covered or explaining a concept.",
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
        "List all learning materials (PDF, transcript, video, concepts) attached to a session.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
      }),
      execute: async ({ sessionId }) => {
        const materials = await listMaterialsForSession(sessionId);
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
      description: "Return the UI focus session and current page path for context.",
      inputSchema: z.object({}),
      execute: async () => ({
        focusSessionId: ctx.focusSessionId ?? null,
        pathname: ctx.pathname ?? null,
        cohortId: ctx.cohortId,
        userRole: ctx.role,
      }),
    }),
  };
}
