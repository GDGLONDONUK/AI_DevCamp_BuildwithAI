import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listSessions, upsertSession } from "../../../../src/lib/server/admin/sessions";
import { withAdmin } from "./withAdmin";

export function registerAdminSessionTools(server: McpServer): void {
  server.registerTool(
    "admin_list_sessions",
    {
      description:
        "Admin/moderator only. List sessions; optional cohort filter (defaults to active cohort). Same collection as GET /api/sessions.",
      inputSchema: {
        cohortId: z.string().optional(),
        allCohorts: z.boolean().optional().describe("If true, return every session"),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (caller, { cohortId, allCohorts }) =>
      listSessions({
        cohortId: cohortId || caller.cohortId,
        allCohorts,
      })
    )
  );

  server.registerTool(
    "admin_upsert_session",
    {
      description:
        "Admin/moderator only. Create or merge-update a session. Same allowlist as POST/PUT /api/sessions. Requires id + title + number for creates.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        number: z.number().optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        week: z.number().optional(),
        topic: z.string().optional(),
        description: z.string().optional(),
        cohortId: z.string().optional(),
        videoUrl: z.string().optional(),
        resourcesFolderUrl: z.string().optional(),
        isKickoff: z.boolean().optional(),
        isClosing: z.boolean().optional(),
        whatYouWillLearn: z.array(z.string()).optional(),
        buildIdeas: z.array(z.string()).optional(),
        resources: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .optional(),
        merge: z
          .boolean()
          .optional()
          .describe("Default true — merge fields. Set false to replace document."),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (caller, args) => {
      const { id, merge, ...fields } = args;
      return upsertSession({
        id,
        fields,
        merge,
        defaultCohortId: caller.cohortId,
      });
    })
  );
}
