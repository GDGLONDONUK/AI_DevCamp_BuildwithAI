/**
 * DELETE /api/admin/mcp/tokens/[id] — revoke any MCP access token
 */

import { NextRequest } from "next/server";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { revokeMcpAccessToken } from "@/lib/mcp/accessTokens";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;
  const { id } = await ctx.params;

  try {
    const done = await revokeMcpAccessToken(id, { allowAny: true });
    if (!done) return err("Token not found", 404);
    return ok({ id, revoked: true });
  } catch (e) {
    logServerRouteException(`DELETE /api/admin/mcp/tokens/${id}`, e);
    return err("Failed to revoke token", 500);
  }
}
