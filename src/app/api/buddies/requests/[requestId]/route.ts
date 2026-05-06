/**
 * PATCH /api/buddies/requests/[requestId] — accept or reject (recipient only).
 */

import { NextRequest } from "next/server";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { buddyRequestPatchSchema } from "@/lib/api/schemas/requestBodies";
import { acceptBuddyRequest, rejectBuddyRequest } from "@/lib/server/buddies";
import { logServerRouteException } from "@/lib/server/appErrorLog";

type Params = { params: Promise<{ requestId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { requestId } = await params;
  if (!requestId?.trim()) return err("Invalid request id", 400);

  const parsed = await parseJsonBody(request, buddyRequestPatchSchema);
  if (!parsed.ok) return parsed.response;
  const { action } = parsed.data;

  try {
    if (action === "accept") {
      await acceptBuddyRequest(requestId, auth.uid);
      return ok({ status: "accepted" as const });
    }
    await rejectBuddyRequest(requestId, auth.uid);
    return ok({ status: "rejected" as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "REQUEST_NOT_FOUND") return err("Request not found", 404);
    if (msg === "FORBIDDEN") return err("Forbidden", 403);
    if (msg === "NOT_PENDING") return err("Request is no longer pending", 409);
    logServerRouteException(`PATCH /api/buddies/requests/${requestId}`, e);
    return err("Failed to update request", 500);
  }
}
