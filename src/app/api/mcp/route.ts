/**
 * Hosted MCP Streamable HTTP endpoint for Claude / ChatGPT / Cursor.
 *
 * URL: https://aidevcamp.gdg.london/api/mcp
 * Auth: Authorization: Bearer <dcmcp_… or Firebase ID token>
 *
 * Note: the page /mcp is only for minting tokens (HTML). Connectors must use /api/mcp.
 */

import { randomUUID } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createDevcampMcpServer } from "../../../../packages/devcamp-mcp/src/createServer";
import {
  resolveCallerFromBearer,
  type McpCaller,
} from "../../../../packages/devcamp-mcp/src/auth";
import { runWithCaller } from "../../../../packages/devcamp-mcp/src/requestContext";

export const runtime = "nodejs";
export const maxDuration = 60;

const sessions = new Map<
  string,
  { transport: WebStandardStreamableHTTPServerTransport; caller: McpCaller }
>();

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version, Accept",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
    "Access-Control-Max-Age": "86400",
  };
  // Bearer-authenticated MCP clients (Claude/ChatGPT connectors) — allow their Origin.
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

function withCors(req: Request, res: Response): Response {
  const out = new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
  for (const [k, v] of Object.entries(corsHeaders(req))) {
    out.headers.set(k, v);
  }
  return out;
}

function jsonError(req: Request, status: number, message: string): Response {
  return withCors(
    req,
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return withCors(req, new Response(null, { status: 204 }));
  }

  let caller: McpCaller;
  try {
    caller = await resolveCallerFromBearer(req.headers.get("authorization") ?? undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return jsonError(req, 401, message);
  }

  const sessionId = req.headers.get("mcp-session-id") ?? undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      if (session.caller.uid !== caller.uid) {
        return jsonError(req, 403, "Forbidden — Authorization does not match this MCP session");
      }
      session.caller = caller;
      const res = await runWithCaller(caller, () =>
        session.transport.handleRequest(req)
      );
      return withCors(req, res);
    }

    // Fresh transport + server (stateless-friendly; session map helps same-instance clients).
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, caller });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };

    const server = createDevcampMcpServer();
    await server.connect(transport);
    const res = await runWithCaller(caller, () => transport.handleRequest(req));
    return withCors(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/mcp]", message);
    return jsonError(req, 500, message);
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}

export async function OPTIONS(req: Request) {
  return withCors(req, new Response(null, { status: 204 }));
}
