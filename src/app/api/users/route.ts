/**
 * GET /api/users — list users (admin/moderator only)
 *
 * Query: ?status=…&search=…&cohortId=…&compact=1&limit=
 * Default cohortId=all (full docs) so existing admin consumers stay unchanged.
 */

import { NextRequest } from "next/server";
import { ok, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { listAdminUsers } from "@/lib/server/admin/users";
import { adminRouteError } from "@/lib/server/admin/http";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const result = await listAdminUsers({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      cohortId: searchParams.get("cohortId") || "all",
      compact: searchParams.get("compact") === "1",
      limit: limitRaw ? Number(limitRaw) : 2000,
    });
    return ok(result.users);
  } catch (e) {
    return adminRouteError("GET /api/users", e, "Failed to fetch users");
  }
}
