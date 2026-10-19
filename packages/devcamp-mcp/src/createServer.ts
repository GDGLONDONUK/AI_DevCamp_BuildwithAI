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

export function createDevcampMcpServer(): McpServer {
  const server = new McpServer({
    name: "ai-devcamp",
    version: "1.3.0",
  });

  registerPublicTools(server);
  registerLearningTools(server);
  registerStudyTools(server);
  registerMyTaskTools(server);
  registerAdminTools(server);

  return server;
}
