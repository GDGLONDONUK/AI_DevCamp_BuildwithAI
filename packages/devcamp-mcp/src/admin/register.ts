import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdminAssignmentTools } from "./assignments";
import { registerAdminAttendanceTools } from "./attendance";
import { registerAdminHackathonTools } from "./hackathon";
import { registerAdminMaterialTools } from "./materials";
import { registerAdminSessionTools } from "./sessions";
import { registerAdminUserTools } from "./users";
import { registerAdminCertifierTools } from "./certifier";

export function registerAdminTools(server: McpServer): void {
  registerAdminUserTools(server);
  registerAdminCertifierTools(server);
  registerAdminSessionTools(server);
  registerAdminAttendanceTools(server);
  registerAdminAssignmentTools(server);
  registerAdminMaterialTools(server);
  registerAdminHackathonTools(server);
}
