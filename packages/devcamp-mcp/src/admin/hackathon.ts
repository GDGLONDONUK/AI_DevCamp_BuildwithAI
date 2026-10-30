import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEVCAMP_HACKATHON_ID } from "../../../../src/lib/hackathon";
import {
  readHackathonSettings,
  updateHackathonSettings,
} from "../../../../src/lib/server/hackathonSettings";
import {
  buildHackathonBoard,
  listHackathonProjectsFiltered,
  patchAdminProject,
  recomputeHackathonVotesAndBoard,
} from "../../../../src/lib/server/hackathonOps";
import { withAdmin } from "./withAdmin";

export function registerAdminHackathonTools(server: McpServer): void {
  server.registerTool(
    "admin_list_projects",
    {
      description:
        "Admin/moderator only. Final / hackathon projects for the live cohort, ranked by voteTotal. Same source as GET /api/admin/hackathon.",
      inputSchema: {
        cohortId: z.string().optional(),
        userId: z.string().optional(),
        status: z.string().max(40).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, args) => listHackathonProjectsFiltered(args))
  );

  server.registerTool(
    "admin_get_hackathon_settings",
    {
      description:
        "Admin/moderator only. Current flags from hackathonSettings/main (also included in admin_hackathon_board).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    withAdmin(async () => {
      const settings = await readHackathonSettings();
      return { hackathonId: DEVCAMP_HACKATHON_ID, ...settings };
    })
  );

  server.registerTool(
    "admin_update_hackathon_settings",
    {
      description:
        "Admin/moderator only. Same as PATCH /api/admin/hackathon. Open/close submissions and audience voting.",
      inputSchema: {
        submissionsOpen: z.boolean().optional(),
        votingOpen: z.boolean().optional(),
        votingMessage: z.string().max(500).optional(),
        winnersAnnounced: z.boolean().optional(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (caller, args) => {
      const settings = await updateHackathonSettings(caller.uid, args);
      return { updated: true, hackathonId: DEVCAMP_HACKATHON_ID, ...settings };
    })
  );

  server.registerTool(
    "admin_hackathon_board",
    {
      description:
        "Admin/moderator only. DAY-OF dashboard: same payload as GET /api/admin/hackathon (settings, counts, leaderboard, winners). Organiser projects are prize-ineligible.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    withAdmin(async () => buildHackathonBoard())
  );

  server.registerTool(
    "admin_recompute_hackathon_votes",
    {
      description:
        "Admin/moderator only. Same as POST /api/admin/hackathon/recompute-votes. Rebuild voteTotal from hackathonVotes.",
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    withAdmin(async () => recomputeHackathonVotesAndBoard())
  );

  server.registerTool(
    "admin_set_project_status",
    {
      description:
        "Admin/moderator only. Same as PATCH /api/projects/[id]. Set draft | submitted | reviewed | shortlisted | winner | passed | failed.",
      inputSchema: {
        projectId: z.string().min(1),
        status: z.enum([
          "draft",
          "submitted",
          "reviewed",
          "shortlisted",
          "winner",
          "passed",
          "failed",
        ]),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (_caller, { projectId, status }) => {
      const project = await patchAdminProject(projectId, { status });
      return { updated: true, project };
    })
  );
}
