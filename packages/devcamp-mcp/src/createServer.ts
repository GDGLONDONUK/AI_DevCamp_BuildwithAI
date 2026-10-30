/**
 * DevCamp MCP — specialist tool packs (not one giant agent).
 * public → learning → study → my-tasks → admin
 * See docs/15-agent-harnessing-optimisation.md
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdminTools } from "./registerAdminTools";
import { registerLearningTools } from "./registerLearningTools";
import { registerMyTaskTools } from "./registerMyTaskTools";
import { registerPublicTools } from "./registerPublicTools";
import { registerStudyTools } from "./registerStudyTools";

export function createDevcampMcpServer(opts?: { includeAdmin?: boolean }): McpServer {
  const server = new McpServer({
    name: "ai-devcamp",
    version: "1.3.1",
  });

  registerPublicTools(server);
  registerLearningTools(server);
  registerStudyTools(server);
  registerMyTaskTools(server);
  // Attendee tokens must not even see admin tools (Claude would otherwise try them).
  if (opts?.includeAdmin !== false) {
    registerAdminTools(server);
  }

  return server;
}
