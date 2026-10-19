/**
 * GET  /api/admin/mcp/tokens?uid=… — list tokens for a user (admin)
 * POST /api/admin/mcp/tokens — mint token for a target user (admin)
 *
 * Admin can mint admin-scoped tokens only when the target is admin|moderator.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import {
  listMcpAccessTokensForUid,
  mintMcpAccessToken,
  type McpTokenScope,
} from "@/lib/mcp/accessTokens";
import { logServerRouteException } from "@/lib/server/appErrorLog";

const mintSchema = z.object({
  uid: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  scope: z.enum(["learning", "admin"]).optional(),
  scopes: z.array(z.enum(["learning", "admin"])).min(1).max(2).optional(),
  ttlHours: z.number().int().min(1).max(24 * 90).optional(),
  label: z.string().trim().max(80).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const uid = new URL(request.url).searchParams.get("uid")?.trim();
    if (!uid) return err("uid query param required");
    const tokens = await listMcpAccessTokensForUid(uid);
    return ok({ uid, tokens });
  } catch (e) {
    logServerRouteException("GET /api/admin/mcp/tokens", e);
    return err("Failed to list tokens", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = mintSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid body");
    }

    let targetUid = parsed.data.uid?.trim();
    const email = parsed.data.email?.trim().toLowerCase();

    if (!targetUid && email) {
      const byEmail = await adminDb().collection("users").doc(email).get();
      if (byEmail.exists) {
        targetUid = byEmail.id;
      } else {
        const q = await adminDb()
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (q.empty) return err(`No user found for email ${email}`, 404);
        targetUid = q.docs[0].id;
      }
    }

    if (!targetUid) return err("uid or email required");

    const userSnap = await adminDb().collection("users").doc(targetUid).get();
    if (!userSnap.exists) return err("User not found", 404);
    const role = (userSnap.data()?.role as string) || "attendee";
    const targetEmail =
      (userSnap.data()?.email as string | undefined) || email || undefined;

    const scopes: McpTokenScope[] = parsed.data.scopes?.length
      ? parsed.data.scopes
      : [parsed.data.scope || "learning"];

    if (scopes.includes("admin") && !["admin", "moderator"].includes(role)) {
      return err(
        "Cannot mint admin MCP scope for an attendee — promote role first or mint learning scope",
        403
      );
    }

    const minted = await mintMcpAccessToken({
      uid: targetUid,
      email: targetEmail,
      role,
      scopes,
      createdByUid: auth.uid,
      label: parsed.data.label || `admin-minted-${scopes.join("+")}`,
      ttlHours: parsed.data.ttlHours,
    });

    return created({
      ...minted,
      warning: "Copy the token now — it will not be shown again.",
    });
  } catch (e) {
    logServerRouteException("POST /api/admin/mcp/tokens", e);
    return err(e instanceof Error ? e.message : "Failed to mint token", 500);
  }
}
