import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  execGetFocusHint,
  execGetSessionDetail,
  execListCohortSessions,
  execListSessionMaterials,
  execSearchSessionMaterials,
} from "../../../src/lib/learning-chat/toolExecutors";
import { requireAttendee, resolveCaller } from "./auth";
import { errResult, okResult } from "./json";

const materialKind = z.enum([
  "session_summary",
  "transcript",
  "pdf",
  "video",
  "slides",
  "concept",
  "notes",
  "resource",
]);

export function registerLearningTools(server: McpServer): void {
  server.registerTool(
    "list_cohort_sessions",
    {
      description:
        "ATTENDEE tier: list Firestore sessions for the caller's enrolled cohort. Prefer list_public_sessions if not enrolled.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        return okResult({
          tier: "attendee",
          source: "firestore:sessions",
          ...(await execListCohortSessions({ cohortId: caller.cohortId })),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "get_session_detail",
    {
      description:
        "ATTENDEE tier: session detail from Firestore (description, outcomes, public resources). Not the RAG corpus.",
      inputSchema: {
        sessionId: z.string().min(1).describe("Firestore sessions document id"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        return okResult({
          tier: "attendee",
          source: "firestore:sessions",
          ...(await execGetSessionDetail({ cohortId: caller.cohortId }, sessionId)),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "search_session_materials",
    {
      description:
        "ATTENDEE tier: RAG search over Firestore sessionLearningMaterials (transcripts, notes, PDFs). Never searches users/tasks.",
      inputSchema: {
        query: z.string().min(1).max(500),
        sessionId: z.string().optional().describe("Limit to one session id"),
        kind: materialKind.optional(),
        limit: z.number().int().min(1).max(12).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, sessionId, kind, limit }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        return okResult({
          tier: "attendee",
          source: "firestore:sessionLearningMaterials",
          ...(await execSearchSessionMaterials(
            { cohortId: caller.cohortId },
            { query, sessionId, kind, limit }
          )),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "list_session_materials",
    {
      description:
        "ATTENDEE tier: list Firestore learning materials (metadata + short preview) for one session.",
      inputSchema: {
        sessionId: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ sessionId }) => {
      try {
        const caller = await resolveCaller();
        requireAttendee(caller);
        return okResult({
          tier: "attendee",
          source: "firestore:sessionLearningMaterials",
          ...(await execListSessionMaterials({ cohortId: caller.cohortId }, sessionId)),
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );

  server.registerTool(
    "get_focus_hint",
    {
      description: "Return caller cohort, enrolment, role, and access tier hints (no private profile fields).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const caller = await resolveCaller();
        return okResult({
          ...execGetFocusHint({
            uid: caller.uid,
            email: caller.email,
            role: caller.role,
            cohortId: caller.cohortId,
          }),
          role: caller.role,
          isAdmin: caller.isAdmin,
          enrolled: caller.enrolled,
          scopes: caller.scopes,
          tiers: {
            public: true,
            attendee: caller.enrolled,
            admin: caller.isAdmin && caller.scopes.includes("admin"),
          },
        });
      } catch (e) {
        return errResult(e instanceof Error ? e.message : String(e));
      }
    }
  );
}
