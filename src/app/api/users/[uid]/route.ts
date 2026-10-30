/**
 * GET   /api/users/[uid]  — get user profile (admin/moderator or own profile)
 * PATCH /api/users/[uid]  — update user status or role
 *
 * PATCH body (admin/moderator): privileged + self-editable fields.
 * PATCH body (own profile): self-editable fields only.
 */

import { NextRequest } from "next/server";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { userPatchBodySchema } from "@/lib/api/schemas/requestBodies";
import { applyUserPatch } from "@/lib/server/admin/users";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";
import { adminRouteError } from "@/lib/server/admin/http";

type Params = { params: Promise<{ uid: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const raw = decodeURIComponent((await params).uid);
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await resolveUserDoc(raw);
    if (!snap?.exists) return err("User not found", 404);
    const isAdmin = ["admin", "moderator"].includes(auth.role);
    if (!isAdmin && auth.uid !== snap.id) return err("Forbidden", 403);
    return ok({ id: snap.id, ...snap.data() });
  } catch (e) {
    return adminRouteError(`GET /api/users/${raw}`, e, "Failed to fetch user");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const raw = decodeURIComponent((await params).uid);
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const isAdmin = ["admin", "moderator"].includes(auth.role);

  try {
    const parsed = await parseJsonBody(request, userPatchBodySchema);
    if (!parsed.ok) return parsed.response;
    const snap = await resolveUserDoc(raw);
    if (!snap?.exists) return err("User not found", 404);
    if (!isAdmin && auth.uid !== snap.id) return err("Forbidden", 403);

    const updated = await applyUserPatch(snap.id, {
      actorIsAdmin: isAdmin,
      fields: parsed.data,
    });
    return ok(updated);
  } catch (e) {
    return adminRouteError(`PATCH /api/users/${raw}`, e, "Failed to update user");
  }
}
