/**
 * POST /api/admin/error-logs/test
 * Inserts a single `error_logs` document so the collection appears in Firebase Console.
 * Admins only (same as GET error-logs list).
 */
import { NextRequest } from "next/server";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { insertErrorLog } from "@/lib/server/appErrorLog";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Only admins can create test log entries", 403);
  }

  const id = await insertErrorLog({
    source: "test",
    message: "Test entry from /admin/errors — the error_logs collection is working.",
    name: "TestLog",
    path: "/api/admin/error-logs/test",
    userId: auth.uid,
    userEmail: auth.email ?? null,
  });
  if (!id) {
    return err("Could not write to error_logs (check Firebase Admin / Firestore)", 500);
  }
  return ok({ id });
}
