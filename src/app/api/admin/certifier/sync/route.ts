/**
 * POST /api/admin/certifier/sync — link existing Certifier credentials (admin only).
 * Does not issue new certificates. Body: { uids?, email?, certifiedOnly? }.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { syncCertifierCredentials } from "@/lib/server/admin/certifierOps";

const bodySchema = z
  .object({
    uids: z.array(z.string().min(1).max(128)).max(200).optional(),
    email: z.string().email().max(320).optional(),
    certifiedOnly: z.boolean().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const result = await syncCertifierCredentials(parsed.data);
    return ok(result);
  } catch (e) {
    logServerRouteException("POST /api/admin/certifier/sync", e);
    const msg = e instanceof Error ? e.message : "Sync failed";
    if (msg.includes("CERTIFIER_API_TOKEN")) {
      return err("Set CERTIFIER_API_TOKEN in server environment", 503);
    }
    return err(msg, 500);
  }
}
