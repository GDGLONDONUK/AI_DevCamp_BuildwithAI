import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type InsertAppErrorLogInput = {
  message: string;
  name?: string | null;
  stack?: string | null;
  /** e.g. client | api | window | react | test */
  source: string;
  path?: string | null;
  url?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userAgent?: string | null;
};

/**
 * Writes one document to `error_logs` (Admin SDK). Used by POST /api/log-error and server catch blocks.
 * Returns the new document id, or null if Firestore write failed.
 */
export async function insertErrorLog(input: InsertAppErrorLogInput): Promise<string | null> {
  try {
    const ref = await adminDb()
      .collection("error_logs")
      .add({
        message: String(input.message).slice(0, 4_000),
        stack: input.stack != null ? String(input.stack).slice(0, 12_000) : null,
        name: input.name != null ? String(input.name).slice(0, 200) : null,
        source: String(input.source || "server").slice(0, 80),
        path: input.path != null ? String(input.path).slice(0, 500) : null,
        url: input.url != null ? String(input.url).slice(0, 2_000) : null,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        userAgent: input.userAgent != null ? String(input.userAgent).slice(0, 500) : null,
        createdAt: FieldValue.serverTimestamp(),
      });
    return ref.id;
  } catch (e) {
    console.error("insertErrorLog: Firestore write failed", e);
    return null;
  }
}

/**
 * Log an exception from an API route `catch` block (also `console.error`s).
 * Fire-and-forget; never throws.
 */
export function logServerRouteException(routeContext: string, e: unknown): void {
  const { message, name, stack } = unknownToErrorParts(e);
  const line = `${routeContext}: ${message}`.slice(0, 2_000);
  console.error(`[api] ${routeContext}`, e);
  void insertErrorLog({
    source: "api",
    message: line,
    name: name || "Error",
    stack: stack || null,
    path: routeContext.slice(0, 500),
  });
}

function unknownToErrorParts(e: unknown): {
  message: string;
  name?: string;
  stack?: string;
} {
  if (e instanceof Error) {
    return { message: e.message || String(e), name: e.name, stack: e.stack };
  }
  return { message: String(e) };
}
