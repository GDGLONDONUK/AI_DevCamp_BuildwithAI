/**
 * AI DevCamp MCP over Streamable HTTP (run on a server / VPS / local port).
 *
 *   npm run mcp:http
 *
 * Env:
 *   DEVCAMP_MCP_PORT=3100
 *   DEVCAMP_MCP_HOST=127.0.0.1   # keep localhost-only unless behind auth proxy
 *   DEVCAMP_MCP_ALLOWED_HOSTS=aidevcamp.gdg.london,localhost
 *
 * Clients send: Authorization: Bearer <dcmcp_… or Firebase ID token>
 * Every request re-validates the Bearer and binds it to the session uid.
 */

import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { resolveCallerFromBearer, type McpCaller } from "./auth";
import { createDevcampMcpServer } from "./createServer";
import { runWithCaller } from "./requestContext";

type Session = {
  transport: StreamableHTTPServerTransport;
  caller: McpCaller;
};

const sessions = new Map<string, Session>();

const port = Number(process.env.DEVCAMP_MCP_PORT || 3100);
const host = process.env.DEVCAMP_MCP_HOST?.trim() || "127.0.0.1";
const allowedHosts = process.env.DEVCAMP_MCP_ALLOWED_HOSTS?.split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const app = createMcpExpressApp({
  host,
  ...(allowedHosts && allowedHosts.length > 0 ? { allowedHosts } : {}),
});

async function bindCaller(req: Request, sessionUid?: string): Promise<McpCaller> {
  const caller = await resolveCallerFromBearer(req.headers.authorization);
  if (sessionUid && caller.uid !== sessionUid) {
    throw new Error("Forbidden — Authorization does not match this MCP session");
  }
  return caller;
}

async function handleMcp(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      // Re-auth every call (prevents session hijack with a stolen mcp-session-id alone).
      const caller = await bindCaller(req, session.caller.uid);
      session.caller = caller;
      await runWithCaller(caller, () =>
        session.transport.handleRequest(req, res, req.body)
      );
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const caller = await bindCaller(req);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, caller });
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      const server = createDevcampMcpServer({
        includeAdmin: caller.isAdmin && caller.scopes.includes("admin"),
      });
      await server.connect(transport);
      await runWithCaller(caller, () => transport.handleRequest(req, res, req.body));
      return;
    }

    if (sessionId) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null,
      });
      return;
    }

    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: Session ID required" },
      id: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = /Missing Authorization|Invalid|expired|revoked|disabled|opt-out|Forbidden|Authentication/i.test(
      message
    )
      ? 401
      : 500;
    if (!res.headersSent) {
      res.status(status).json({
        jsonrpc: "2.0",
        error: { code: -32000, message },
        id: null,
      });
    }
    console.error("[mcp:http]", message);
  }
}

app.post("/mcp", handleMcp);
app.get("/mcp", handleMcp);
app.delete("/mcp", handleMcp);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-devcamp-mcp", sessions: sessions.size });
});

app.listen(port, host, () => {
  console.error(`AI DevCamp MCP HTTP listening on http://${host}:${port}/mcp`);
  console.error("Clients must send Authorization: Bearer <dcmcp_… or Firebase ID token>");
  console.error(`Bound host=${host} (use 127.0.0.1 unless behind a trusted reverse proxy)`);
});
