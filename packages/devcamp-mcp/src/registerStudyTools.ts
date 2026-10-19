import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildFlashcards,
  buildLearningGuide,
  buildQuiz,
} from "../../../src/lib/learning-chat/studyAids";
import { requireAttendee, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";

/**
 * NotebookLM-inspired study aids for BYO-LLM hosts:
 * flashcards, quizzes, Learning Guide (Socratic tutor pack).
 * @see https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-student-features/
 */
export function registerStudyTools(server: McpServer): void {
  server.registerTool(
    "prepare_flashcards",
    {
      description:
        "Build recall flashcards (key terms, outcomes, dates) from programme materials for a session — NotebookLM-style. Host LLM presents cards; do not invent facts beyond the payload.",
      inputSchema: {
        sessionId: z.string().min(1).describe("Firestore sessions document id"),
        topic: z.string().max(200).optional().describe("Optional filter for concepts"),
        limit: z.number().int().min(1).max(24).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId, topic, limit }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const result = await buildFlashcards({
          cohortId: caller.cohortId,
          sessionId,
          topic,
          limit,
        });
        if ("error" in result) return errResult(result.error);
        return okResult({ tier: "attendee", source: "firestore:sessionLearningMaterials", ...result });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "prepare_quiz",
    {
      description:
        "Build a multiple-choice quiz grounded in session concepts/materials. Host LLM asks one question at a time and scores against correctIndex.",
      inputSchema: {
        sessionId: z.string().min(1),
        limit: z.number().int().min(1).max(12).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId, limit, difficulty }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const result = await buildQuiz({
          cohortId: caller.cohortId,
          sessionId,
          limit,
          difficulty,
        });
        if ("error" in result) return errResult(result.error);
        return okResult({ tier: "attendee", source: "firestore:sessionLearningMaterials", ...result });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "start_learning_guide",
    {
      description:
        "ATTENDEE tier: Learning Guide (Socratic tutor) grounded in Firestore materials. Prefer questions over lectures.",
      inputSchema: {
        sessionId: z.string().optional().describe("Focus session; omit for cohort-wide"),
        focusTopic: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId, focusTopic }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        const pack = await buildLearningGuide({
          cohortId: caller.cohortId,
          sessionId,
          focusTopic,
        });
        return okResult({ tier: "attendee", ...pack });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
