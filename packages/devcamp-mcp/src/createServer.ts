import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdminTools } from "./registerAdminTools";
import { registerLearningTools } from "./registerLearningTools";
import { registerMyTaskTools } from "./registerMyTaskTools";
import { registerPublicTools } from "./registerPublicTools";
import { registerStudyTools } from "./registerStudyTools";

export function createDevcampMcpServer(): McpServer {
  const server = new McpServer({
    name: "ai-devcamp",
    version: "1.2.0",
  });

  registerPublicTools(server);
  registerLearningTools(server);
  registerStudyTools(server);
  registerMyTaskTools(server);
  registerAdminTools(server);

  return server;
}
