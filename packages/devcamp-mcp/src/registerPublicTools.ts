import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { publicScheduleSessionFields } from "../../../src/lib/access/programmeAccess";
import {
  getSessionById,
  listSessionsForCohort,
} from "../../../src/lib/learning-chat/materialsRepoCore";
import { SPRING_2026_COHORT_ID } from "../../../src/lib/cohorts";
import { resolveActiveCohortIdFromDb } from "../../../src/lib/server/activeCohort";
import { requireAuthenticated, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";
import { LEARNING_HARNESS, LEARNING_CHAT_TOOL_NAMES } from "../../../src/lib/learning-chat/harness";

/**
 * Public-tier MCP tools — Firestore `sessions` only (same data as the public website).
 * No transcripts, materials corpus, users, or tasks.
 */
export function registerPublicTools(server: McpServer): void {
  server.registerTool(
    "describe_devcamp_ai_stack",
    {
      description:
        "PUBLIC: how AI DevCamp wires Learning Chat, MCP tool packs, and maintainer skills " +
        "(harness principles — not curriculum slide images). Read this before inventing new tools.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const caller = await resolveCaller();
        // Attendees get learning-oriented summary only — no admin/maintainer attack surface map.
        if (!caller.isAdmin || !caller.scopes.includes("admin")) {
          return okResult({
            audience: "attendee",
            canAccess: [
              "programme schedule",
              "cohort lesson materials",
              "flashcards / quiz / learning guide",
              "your own learning tasks",
            ],
            cannotAccess: ["other people's data"],
            setup: "Mint a learning token on /mcp; client steps on /faq",
            inAppChat: "Signed-in Learning Assistant on the site (same materials)",
          });
        }
        return okResult({
          audience: "staff",
          principle: "AI decides; tools execute. Not one giant agent.",
          surfaces: {
            learningChat: {
              endpoint: "POST /api/learning-chat",
              modelEnv: "LEARNING_GEMINI_MODEL",
              tools: LEARNING_CHAT_TOOL_NAMES,
              harness: LEARNING_HARNESS,
              dryRun: "Pass dryRun:true to plan without calling Gemini",
              measure: "learning_chat_logs",
            },
            mcp: {
              packs: ["public", "learning", "study", "my-tasks", "admin"],
              attendeeSetup: "/faq and /mcp on aidevcamp.gdg.london",
              sharedExecutors: "src/lib/learning-chat/toolExecutors.ts",
            },
            maintainerSkills: {
              path: ".claude/skills/*",
              note: "Repo maintainers only — not for attendees learning the curriculum",
              learning: ".claude/skills/learning-chat/SKILL.md",
            },
            cohortProjectAgents: {
              prefer: "Google ADK + Gemini/Vertex",
              example: "examples/adk-harnessed-agent/",
              guide: "docs/15-agent-harnessing-optimisation.md",
            },
          },
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "list_public_sessions",
    {
      description:
        "PUBLIC tier: list programme schedule from Firestore (titles, dates, topics). " +
        "No learning materials, users, or private tasks. Works without cohort enrolment.",
      inputSchema: {
        cohortId: z
          .string()
          .optional()
          .describe("Defaults to active cohort / caller's cohort"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cohortId }) => {
      try {
        const caller = await resolveCaller();
        requireAuthenticated(caller);
        const cid =
          cohortId?.trim() ||
          caller.cohortId ||
          (await resolveActiveCohortIdFromDb());
        const sessions = await listSessionsForCohort(cid);
        return okResult({
          tier: "public",
          source: "firestore:sessions",
          cohortId: cid,
          count: sessions.length,
          sessions: sessions.map((s) => publicScheduleSessionFields(s)),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "get_public_session",
    {
      description:
        "PUBLIC tier: one session's public schedule fields from Firestore. No RAG corpus text.",
      inputSchema: {
        sessionId: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId }) => {
      try {
        const caller = await resolveCaller();
        requireAuthenticated(caller);
        const session = await getSessionById(sessionId);
        if (!session) return errResult(`Session not found: ${sessionId}`);
        const sessionCohort = session.cohortId || SPRING_2026_COHORT_ID;
        return okResult({
          tier: "public",
          source: "firestore:sessions",
          cohortId: sessionCohort,
          session: publicScheduleSessionFields(session),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
