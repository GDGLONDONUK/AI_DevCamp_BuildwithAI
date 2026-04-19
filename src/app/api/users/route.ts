/**
 * GET /api/users — list all users (admin/moderator only)
 *
 * Query params:
 *   ?status=pending|participated|certified|not-certified|failed
 *   ?search=string   (matches displayName or email)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const searchTerm   = searchParams.get("search")?.toLowerCase();

    let query = adminDb().collection("users").orderBy("createdAt", "desc") as FirebaseFirestore.Query;

    if (statusFilter) {
      query = query.where("userStatus", "==", statusFilter);
    }

    const snap = await query.get();
    let users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Apply text search client-side (Firestore doesn't support full-text search)
    if (searchTerm) {
      users = users.filter((u: Record<string, unknown>) => {
        const name  = String(u.displayName ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const handle = String(u.handle ?? "").toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm) || handle.includes(searchTerm);
      });
    }

    return ok(users);
  } catch (e) {
    console.error("GET /api/users", e);
    return err("Failed to fetch users", 500);
  }
}
