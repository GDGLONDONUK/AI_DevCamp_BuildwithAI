/**
 * Shared utilities for Next.js API route handlers.
 *
 * - verifyAuth()   — verifies a Firebase ID token from the Authorization header
 * - requireAdmin() — extends verifyAuth to also confirm role === "admin"
 * - ok()           — 200 JSON response helper
 * - created()      — 201 JSON response helper
 * - err()          — error JSON response helper
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

// ── Response helpers ──────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export interface AuthResult {
  uid: string;
  email: string | undefined;
  role: string;
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token payload or throws an error response.
 *
 * Usage in a route handler:
 *   const auth = await verifyAuth(request);
 *   if (auth instanceof NextResponse) return auth; // 401
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return err("Missing Authorization header", 401);
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    // Fetch the user's Firestore role
    const userSnap = await adminDb().collection("users").doc(decoded.uid).get();
    const role = (userSnap.data()?.role as string) ?? "attendee";

    return { uid: decoded.uid, email: decoded.email, role };
  } catch {
    return err("Invalid or expired token", 401);
  }
}

/**
 * Like verifyAuth, but also asserts the user has role "admin" or "moderator".
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult | NextResponse> {
  const result = await verifyAuth(request);
  if (result instanceof NextResponse) return result;
  if (!["admin", "moderator"].includes(result.role)) {
    return err("Forbidden — admin or moderator role required", 403);
  }
  return result;
}

/**
 * Like verifyAuth, but also asserts the user is an admin OR the request is for
 * their own resource (uid matches the resource uid).
 */
export async function requireAdminOrSelf(
  request: NextRequest,
  resourceUid: string
): Promise<AuthResult | NextResponse> {
  const result = await verifyAuth(request);
  if (result instanceof NextResponse) return result;
  if (!["admin", "moderator"].includes(result.role) && result.uid !== resourceUid) {
    return err("Forbidden", 403);
  }
  return result;
}
