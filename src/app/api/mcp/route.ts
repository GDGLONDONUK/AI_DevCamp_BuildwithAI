/**
 * Hosted MCP Streamable HTTP endpoint for Claude / ChatGPT / Cursor.
 *
 * URL: https://aidevcamp.gdg.london/api/mcp
 * Auth: Authorization: Bearer <dcmcp_… or Firebase ID token>
 *
 * Stateless (required on Vercel): each request gets a fresh transport + server.
 * In-memory session maps break across serverless instances and cause
 * "Server not initialized" when Claude reuses mcp-session-id on another isolate.
 *
 * Note: the page /mcp is only for minting tokens (HTML). Connectors must use /api/mcp.
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createDevcampMcpServer } from "../../../../packages/devcamp-mcp/src/createServer";
import { resolveCallerFromBearer } from "../../../../packages/devcamp-mcp/src/auth";
import { runWithCaller } from "../../../../packages/devcamp-mcp/src/requestContext";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  let caller;
  try {
    caller = await resolveCallerFromBearer(req.headers.get("authorization") ?? undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return jsonError(req, 401, message);
  }

  // Stateless: never reuse transport across requests (Vercel / multi-instance safe).
  // sessionIdGenerator omitted → SDK skips session validation ("Server not initialized").
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const includeAdmin = caller.isAdmin && caller.scopes.includes("admin");
  const server = createDevcampMcpServer({ includeAdmin });

  try {
    await server.connect(transport);
    const res = await runWithCaller(caller, () => transport.handleRequest(req));
    return withCors(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/mcp]", message);
    return jsonError(req, 500, message);
  } finally {
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
    try {
      await server.close();
    } catch {
      /* ignore */
    }
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
