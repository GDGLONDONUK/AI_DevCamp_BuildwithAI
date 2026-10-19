/**
 * GET  /api/mcp/tokens — list caller's MCP access tokens (metadata only)
 * POST /api/mcp/tokens — mint opaque MCP token for self
 *
 * Body: { scope?: "learning" | "admin", scopes?: string[], ttlHours?, label? }
 * Admin scope only if caller role is admin|moderator.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import {
  listMcpAccessTokensForUid,
  mintMcpAccessToken,
  type McpTokenScope,
} from "@/lib/mcp/accessTokens";
import { logServerRouteException } from "@/lib/server/appErrorLog";

const mintSchema = z.object({
  scope: z.enum(["learning", "admin"]).optional(),
  scopes: z.array(z.enum(["learning", "admin"])).min(1).max(2).optional(),
  ttlHours: z.number().int().min(1).max(24 * 90).optional(),
  label: z.string().trim().max(80).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const tokens = await listMcpAccessTokensForUid(auth.uid);
    return ok({ tokens });
  } catch (e) {
    logServerRouteException("GET /api/mcp/tokens", e);
    return err("Failed to list MCP tokens", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = mintSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid body");
    }

    const scopes: McpTokenScope[] = parsed.data.scopes?.length
      ? parsed.data.scopes
      : [parsed.data.scope || "learning"];

    if (scopes.includes("admin") && !["admin", "moderator"].includes(auth.role)) {
      return err("Only admins/moderators can mint admin-scoped MCP tokens", 403);
    }

    const userSnap = await adminDb().collection("users").doc(auth.uid).get();
    const role = (userSnap.data()?.role as string) || auth.role;

    const minted = await mintMcpAccessToken({
      uid: auth.uid,
      email: auth.email,
      role,
      scopes,
      createdByUid: auth.uid,
      label: parsed.data.label,
      ttlHours: parsed.data.ttlHours,
    });

    return created({
      ...minted,
      warning: "Copy the token now — it will not be shown again.",
    });
  } catch (e) {
    logServerRouteException("POST /api/mcp/tokens", e);
    return err(e instanceof Error ? e.message : "Failed to mint token", 500);
  }
}
