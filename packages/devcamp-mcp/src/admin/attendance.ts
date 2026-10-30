import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAdminAttendance,
  setAdminAttendance,
} from "../../../../src/lib/server/admin/attendance";
import { withAdmin } from "./withAdmin";

export function registerAdminAttendanceTools(server: McpServer): void {
  server.registerTool(
    "admin_get_attendance",
    {
      description:
        "Admin/moderator only. Same as GET /api/attendance/[uid]. Accepts uid or email. Source of truth is attendance/{uid}, not Luma or users.registeredSessions.",
      inputSchema: {
        uid: z.string().min(1).describe("Firebase Auth uid or email"),
      },
      annotations: { readOnlyHint: true },
    },
    withAdmin(async (_caller, { uid }) => getAdminAttendance(uid))
  );

  server.registerTool(
    "admin_set_attendance",
    {
      description:
        "Admin/moderator only. Same as PATCH /api/attendance/[uid]. Writes sessionAttendanceAudit with source admin. Skips cancelled sessions unless force=true.",
      inputSchema: {
        uid: z.string().min(1),
        sessionId: z.string().min(1),
        attended: z.boolean(),
        force: z
          .boolean()
          .optional()
          .describe("Allow marking cancelled sessions (e.g. sept-2026-govern-sat)"),
      },
      annotations: { destructiveHint: true },
    },
    withAdmin(async (caller, { uid, sessionId, attended, force }) =>
      setAdminAttendance({
        uidOrEmail: uid,
        sessionId,
        attended,
        actorUid: caller.uid,
        force,
      })
    )
  );
}
