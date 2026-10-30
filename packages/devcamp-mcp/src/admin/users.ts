import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  applyUserPatch,
  getAdminUser,
  listAdminUsers,
} from "../../../../src/lib/server/admin/users";
import { buildFilteredCohortCompletionReport } from "../../../../src/lib/server/cohortCompletion";
import { withAdmin } from "./withAdmin";

const userStatus = z.enum([
  "pending",
  "participated",
  "certified",
  "outstanding",
  "not-certified",
  "failed",
]);

const userRole = z.enum(["attendee", "moderator", "admin"]);

export function registerAdminUserTools(server: McpServer): void {
  server.registerTool(
    "admin_cohort_completion",
    {
      description:
        "Admin/moderator only. PRIMARY tool for certification checks. Same data as GET /api/admin/cohort-completion. Reads attendance/{uid} (NOT users.registeredSessions). Combines attendance + assignments + live-cohort projects. For day-of votes/winners use admin_hackathon_board.",
      inputSchema: {
        cohortId: z.string().optional(),
        minSessions: z.number().int().min(1).max(20).optional(),
        excludeCancelled: z.boolean().optional(),
        excludeUpcoming: z.boolean().optional(),
        includeStaff: z.boolean().optional(),
        filter: z
          .enum(["all", "meetsAll", "meetsAttendanceAndWork", "missingProject", "belowAttendance"])
          .optional(),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, args) => buildFilteredCohortCompletionReport(args))
  );

  server.registerTool(
    "admin_list_users",
    {
      description:
        "Admin/moderator only. Compact user list for the live cohort by default. Same filters as GET /api/users?compact=1. Does NOT include attendance.",
      inputSchema: {
        status: userStatus.optional(),
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(2000).optional(),
        cohortId: z
          .string()
          .optional()
          .describe("Defaults to the live cohort. Pass 'all' for every user."),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, args) =>
      listAdminUsers({
        status: args.status,
        search: args.search,
        limit: args.limit,
        cohortId: args.cohortId,
        compact: true,
      })
    )
  );

  server.registerTool(
    "admin_get_user",
    {
      description:
        "Admin/moderator only. User by uid or email, plus attendance/{uid} and current-cohort project.",
      inputSchema: {
        uid: z.string().min(1).describe("Firebase uid or email"),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, { uid }) => getAdminUser(uid))
  );

  server.registerTool(
    "admin_update_user",
    {
      description:
        "Admin/moderator only. Same privileged field rules as PATCH /api/users/[uid] (status, role, opt-out, cohort tags, displayName).",
      inputSchema: {
        uid: z.string().min(1),
        userStatus: userStatus.optional(),
        role: userRole.optional(),
        programOptOut: z.boolean().optional(),
        accountDisabled: z.boolean().optional(),
        displayName: z.string().max(200).optional(),
        cohortIds: z.array(z.string()).optional(),
        activeCohortId: z.string().optional(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (_caller, args) => {
      const { uid, ...fields } = args;
      return applyUserPatch(uid, { actorIsAdmin: true, fields });
    })
  );
}
