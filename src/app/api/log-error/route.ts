/**
 * POST /api/log-error
 * Accepts client-side error reports and writes to Firestore `error_logs` via Admin SDK.
 * Optional `Authorization: Bearer` attaches user; otherwise logged anonymously.
 */
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { ok, err } from "@/lib/api-helpers";
import { insertErrorLog } from "@/lib/server/appErrorLog";

const MAX_BODY = 48_000;
const MAX_MSG = 2_000;
const MAX_STACK = 12_000;

function trunc(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return err("Payload too large", 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return err("Invalid JSON", 400);
  }

  const message = trunc(String(body.message || "Error"), MAX_MSG);
  const stack = body.stack != null ? trunc(String(body.stack), MAX_STACK) : undefined;
  const name = body.name != null ? trunc(String(body.name), 200) : undefined;
  const source = trunc(String(body.source || "unknown"), 50);
  const path = body.path != null ? trunc(String(body.path), 500) : undefined;
  const url = body.url != null ? trunc(String(body.url), 2_000) : undefined;

  let userId: string | null = null;
  let userEmail: string | null = null;
  const h = request.headers.get("authorization");
  if (h?.startsWith("Bearer ")) {
    try {
      const t = h.slice(7);
      const d = await adminAuth().verifyIdToken(t);
      userId = d.uid;
      userEmail = d.email ?? null;
    } catch {
      // anonymous
    }
  }

  const userAgent = trunc(request.headers.get("user-agent") || "", 500);

  const id = await insertErrorLog({
    message,
    name,
    stack: stack || null,
    source,
    path: path || null,
    url: url || null,
    userId,
    userEmail,
    userAgent: userAgent || null,
  });
  if (!id) {
    return err("Failed to log", 500);
  }
  return ok({ id });
}
