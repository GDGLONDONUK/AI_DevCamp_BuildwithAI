import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAssignment,
  listAssignments,
  updateAssignment,
} from "../../../../src/lib/server/admin/assignments";
import { withAdmin } from "./withAdmin";

const assignmentStatus = z.enum(["submitted", "reviewed", "approved"]);

export function registerAdminAssignmentTools(server: McpServer): void {
  server.registerTool(
    "admin_list_assignments",
    {
      description:
        "Admin/moderator only. Weekly lab/session assignments. NOT the hackathon final (see admin_list_projects).",
      inputSchema: {
        userId: z.string().optional(),
        sessionId: z.string().optional(),
        status: assignmentStatus.optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, args) => listAssignments(args))
  );

  server.registerTool(
    "admin_get_assignment",
    {
      description: "Admin/moderator only. Get one assignment by document id. Same as GET /api/assignments/[id].",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, { id }) => getAssignment(id))
  );

  server.registerTool(
    "admin_update_assignment",
    {
      description:
        "Admin/moderator only. Same as PATCH /api/assignments/[id] (status, feedback, grade).",
      inputSchema: {
        id: z.string().min(1),
        status: assignmentStatus.optional(),
        feedback: z.string().max(5000).optional(),
        grade: z.string().max(80).optional(),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (_caller, { id, status, feedback, grade }) =>
      updateAssignment(id, { status, feedback, grade })
    )
  );
}
