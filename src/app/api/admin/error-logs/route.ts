/**
 * GET /api/admin/error-logs
 * Lists recent `error_logs` (admin only). Date filters & search are applied in-process
 * after a capped Firestore read (suitable for moderate traffic).
 */
import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, verifyAuth, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import type { AppErrorLog } from "@/types";

const FETCH_CAP = 800;

function toIso(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return new Date(0).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Only admins can view error logs", 403);
  }

  const { searchParams } = new URL(request.url);
  const fromQ = searchParams.get("from");
  const toQ = searchParams.get("to");
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const limit = Math.min(
    500,
    Math.max(25, parseInt(searchParams.get("limit") || "200", 10) || 200)
  );

  const fromD = fromQ ? new Date(fromQ) : null;
  const toD = toQ ? new Date(toQ) : null;
  if (fromD && Number.isNaN(fromD.getTime())) return err("Invalid from date", 400);
  if (toD && Number.isNaN(toD.getTime())) return err("Invalid to date", 400);

  try {
    const snap = await adminDb()
      .collection("error_logs")
      .orderBy("createdAt", "desc")
      .limit(FETCH_CAP)
      .get();

    const rows: AppErrorLog[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          message: String(data.message || ""),
          name: data.name ? String(data.name) : undefined,
          stack: data.stack ? String(data.stack) : undefined,
          source: String(data.source || "unknown"),
          path: data.path ? String(data.path) : undefined,
          url: data.url ? String(data.url) : undefined,
          userId: data.userId ? String(data.userId) : undefined,
          userEmail: data.userEmail ? String(data.userEmail) : undefined,
          userAgent: data.userAgent ? String(data.userAgent) : undefined,
          createdAt: toIso(data.createdAt),
        };
      })
      .filter((r) => {
        const t = new Date(r.createdAt);
        if (fromD && t < fromD) return false;
        if (toD) {
          const end = new Date(toD);
          end.setHours(23, 59, 59, 999);
          if (t > end) return false;
        }
        if (q) {
          const h = (
            r.message +
            (r.stack || "") +
            (r.path || "") +
            (r.name || "")
          ).toLowerCase();
          if (!h.includes(q)) return false;
        }
        return true;
      })
      .slice(0, limit);

    return ok({ logs: rows, scanned: snap.size, returned: rows.length });
  } catch (e) {
    logServerRouteException("GET /api/admin/error-logs", e);
    return err("Failed to load error logs", 500);
  }
}
