/**
 * GET  /api/sessions  — list all sessions (public)
 * POST /api/sessions  — create a new session (admin/moderator only)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { listSessions, upsertSession } from "@/lib/server/admin/sessions";
import { adminRouteError } from "@/lib/server/admin/http";

const createSchema = z
  .object({
    id: z.string().min(1).max(160),
  })
  .passthrough();

export async function GET() {
  try {
    const { sessions } = await listSessions({ allCohorts: true });
    return ok(sessions);
  } catch (e) {
    return adminRouteError("GET /api/sessions", e, "Failed to fetch sessions");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) return parsed.response;
    const { id, ...fields } = parsed.data as { id: string } & Record<string, unknown>;
    const saved = await upsertSession({ id, fields, merge: false });
    return created(saved);
  } catch (e) {
    return adminRouteError("POST /api/sessions", e, "Failed to create session");
  }
}
