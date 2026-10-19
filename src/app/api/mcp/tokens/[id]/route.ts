/**
 * DELETE /api/mcp/tokens/[id] — revoke caller's own MCP access token
 */

import { NextRequest } from "next/server";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { revokeMcpAccessToken } from "@/lib/mcp/accessTokens";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const okRevoke = await revokeMcpAccessToken(id, { uid: auth.uid });
    if (!okRevoke) return err("Token not found", 404);
    return ok({ id, revoked: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return err("Forbidden", 403);
    }
    logServerRouteException(`DELETE /api/mcp/tokens/${id}`, e);
    return err("Failed to revoke token", 500);
  }
}
