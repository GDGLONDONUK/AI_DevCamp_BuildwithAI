import "server-only";

import { tool } from "ai";
import { z } from "zod";
import type { LearningChatContext } from "@/lib/learning-chat/constants";
import { LEARNING_HARNESS } from "@/lib/learning-chat/harness";
import {
  execGetFocusHint,
  execGetSessionDetail,
  execListCohortSessions,
  execListSessionMaterials,
  execSearchSessionMaterials,
} from "@/lib/learning-chat/toolExecutors";
import {
  buildFlashcards,
  buildLearningGuide,
  buildQuiz,
} from "@/lib/learning-chat/studyAids";

export function buildLearningChatTools(ctx: LearningChatContext) {
  return {
    list_cohort_sessions: tool({
      description:
        "List programme sessions for the active cohort (titles, dates, topics, weeks). Use for schedule overview. Does NOT return user or attendance data.",
      inputSchema: z.object({}),
      execute: async () => execListCohortSessions(ctx),
    }),

    get_session_detail: tool({
      description:
        "Get session learning content: description, outcomes, build ideas, public resources, video URL, speaker names. Cohort-scoped only.",
      inputSchema: z.object({
        sessionId: z.string().min(1).describe("Firestore sessions document id"),
      }),
      execute: async ({ sessionId }) => execGetSessionDetail(ctx, sessionId),
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
        limit: z
          .number()
          .int()
          .min(1)
          .max(LEARNING_HARNESS.maxSearchHits)
          .optional(),
      }),
      execute: async ({ query, sessionId, kind, limit }) =>
        execSearchSessionMaterials(ctx, { query, sessionId, kind, limit }),
    }),

    list_session_materials: tool({
      description:
        "List programme learning materials (PDF, transcript, video, concepts) for one session in the active cohort.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
      }),
      execute: async ({ sessionId }) => execListSessionMaterials(ctx, sessionId),
    }),

    get_focus_hint: tool({
      description:
        "Return the UI focus session id and page path only (no user profile fields).",
      inputSchema: z.object({}),
      execute: async () => execGetFocusHint(ctx),
    }),

    prepare_flashcards: tool({
      description:
        "Build recall flashcards (terms, outcomes, dates) from programme materials for a session. Present one card at a time.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
        topic: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(24).optional(),
      }),
      execute: async ({ sessionId, topic, limit }) => {
        const sid = sessionId || ctx.focusSessionId;
        if (!sid) return { error: "sessionId required (or open a session page for focus)." };
        return buildFlashcards({ cohortId: ctx.cohortId, sessionId: sid, topic, limit });
      },
    }),

    prepare_quiz: tool({
      description:
        "Build a short multiple-choice quiz grounded in session materials. Ask one question at a time.",
      inputSchema: z.object({
        sessionId: z.string().min(1),
        limit: z.number().int().min(1).max(12).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }),
      execute: async ({ sessionId, limit, difficulty }) => {
        const sid = sessionId || ctx.focusSessionId;
        if (!sid) return { error: "sessionId required (or open a session page for focus)." };
        return buildQuiz({ cohortId: ctx.cohortId, sessionId: sid, limit, difficulty });
      },
    }),

    start_learning_guide: tool({
      description:
        "Start Learning Guide mode: Socratic tutoring with probing questions grounded in materials. Prefer questions over lectures.",
      inputSchema: z.object({
        sessionId: z.string().optional(),
        focusTopic: z.string().max(200).optional(),
      }),
      execute: async ({ sessionId, focusTopic }) =>
        buildLearningGuide({
          cohortId: ctx.cohortId,
          sessionId: sessionId || ctx.focusSessionId,
          focusTopic,
        }),
    }),
  };
}
