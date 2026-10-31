/**
 * POST /api/admin/certifier/issue — create, issue, and email a Credsverse credential.
 * Admin only. Counts against the Certifier annual credential quota.
 * Body: { uid?, email?, groupId?, skipIfExists?, markCertified? }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { issueCertifierCredential } from "@/lib/server/admin/certifierOps";
import { adminRouteError } from "@/lib/server/admin/http";

const bodySchema = z
  .object({
    uid: z.string().min(1).max(320).optional(),
    email: z.string().email().max(320).optional(),
    groupId: z.string().min(1).max(80).optional(),
    skipIfExists: z.boolean().optional(),
    markCertified: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Boolean(d.uid?.trim() || d.email?.trim()), {
    message: "uid or email is required",
  });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const uidOrEmail = parsed.data.uid?.trim() || parsed.data.email!.trim();
    const result = await issueCertifierCredential({
      uidOrEmail,
      groupId: parsed.data.groupId,
      skipIfExists: parsed.data.skipIfExists,
      markCertified: parsed.data.markCertified,
    });
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("CERTIFIER_API_TOKEN") || msg.includes("CERTIFIER_GROUP_ID")) {
      return err(msg.includes("GROUP") ? msg : "Set CERTIFIER_API_TOKEN in server environment", 503);
    }
    return adminRouteError(
      "POST /api/admin/certifier/issue",
      e,
      "Failed to issue certificate"
    );
  }
}
