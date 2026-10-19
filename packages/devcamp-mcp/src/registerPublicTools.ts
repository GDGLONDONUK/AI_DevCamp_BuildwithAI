import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { publicScheduleSessionFields } from "../../../src/lib/access/programmeAccess";
import {
  getSessionById,
  listSessionsForCohort,
} from "../../../src/lib/learning-chat/materialsRepoCore";
import { getActiveCohortId, SPRING_2026_COHORT_ID } from "../../../src/lib/cohorts";
import { requireAuthenticated, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";

/**
 * Public-tier MCP tools — Firestore `sessions` only (same data as the public website).
 * No transcripts, materials corpus, users, or tasks.
 */
export function registerPublicTools(server: McpServer): void {
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
        const cid = cohortId?.trim() || caller.cohortId || getActiveCohortId();
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
