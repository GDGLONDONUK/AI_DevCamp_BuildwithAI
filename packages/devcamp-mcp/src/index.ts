/**
 * AI DevCamp MCP server (stdio).
 *
 * Auth (either):
 *   DEVCAMP_MCP_ACCESS_TOKEN  — opaque token from site /mcp (preferred)
 *   DEVCAMP_MCP_ID_TOKEN      — Firebase ID token
 *
 * HTTP (server): npm run mcp:http
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDevcampMcpServer } from "./createServer";

async function main() {
  const server = createDevcampMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AI DevCamp MCP server running on stdio");
}

main().catch((err) => {
  console.error("DevCamp MCP failed to start:", err);
  process.exit(1);
});
