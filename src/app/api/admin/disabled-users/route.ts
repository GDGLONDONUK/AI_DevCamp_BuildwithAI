/**
 * GET  /api/admin/disabled-users — list archived profiles (`disabledUsers/*`).
 * POST /api/admin/disabled-users — archive (`users/{uid}` → `disabledUsers/{uid}`) or restore (reverse).
 *
 * Admin only (Firebase role === admin).
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { stripProfileArchiveMeta } from "@/lib/server/disabledUsersArchive";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { z } from "zod";

const postBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("archive"),
    uid: z.string().min(1),
    reason: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("restore"),
    uid: z.string().min(1),
  }),
]);

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Forbidden — only admins can view disabled users", 403);
  }

  try {
    const snap = await adminDb().collection("disabledUsers").limit(500).get();

    const rows = snap.docs.map((d) => {
      const row: Record<string, unknown> = {
        uid: d.id,
        firestoreId: d.id,
        ...d.data(),
      };
      return row;
    });

    rows.sort((a, b) => {
      const ta = typeof a.profileArchivedAt === "string" ? a.profileArchivedAt : "";
      const tb = typeof b.profileArchivedAt === "string" ? b.profileArchivedAt : "";
      return tb.localeCompare(ta);
    });

    return ok({ users: rows });
  } catch (e) {
    logServerRouteException("GET /api/admin/disabled-users", e);
    return err("Failed to list disabled users", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Forbidden — only admins can move users to disabledUsers", 403);
  }

  const parsed = await parseJsonBody(request, postBodySchema);
  if (!parsed.ok) return parsed.response;

  const { action, uid } = parsed.data;
  const normalizedUid = uid.trim();
  if (normalizedUid.includes("@")) {
    return err("Invalid uid — pending email imports cannot be archived this way", 400);
  }

  const db = adminDb();
  const usersRef = db.collection("users").doc(normalizedUid);
  const disabledRef = db.collection("disabledUsers").doc(normalizedUid);

  try {
    if (action === "archive") {
      const userSnap = await usersRef.get();
      if (!userSnap.exists) {
        return err("User profile not found in users collection", 404);
      }

      const role = userSnap.data()?.role as string | undefined;
      if (role === "admin") {
        return err("Cannot archive admin accounts — change role first", 403);
      }

      const reason =
        parsed.data.reason !== undefined ? parsed.data.reason.trim() || null : null;

      const batch = db.batch();
      batch.set(disabledRef, {
        ...userSnap.data(),
        profileArchivedAt: new Date().toISOString(),
        profileArchivedByUid: auth.uid,
        profileArchivedReason: reason,
      });
      batch.delete(usersRef);
      await batch.commit();

      return ok({ archived: true, uid: normalizedUid });
    }

    const disSnap = await disabledRef.get();
    if (!disSnap.exists) {
      return err("No archived profile for this uid", 404);
    }

    const activeSnap = await usersRef.get();
    if (activeSnap.exists) {
      return err("User already exists in users collection — resolve duplicate before restore", 409);
    }

    const raw = disSnap.data() as Record<string, unknown>;
    const cleaned = stripProfileArchiveMeta(raw);

    const batch = db.batch();
    batch.set(usersRef, {
      ...cleaned,
      uid: normalizedUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.delete(disabledRef);
    await batch.commit();

    return ok({ restored: true, uid: normalizedUid });
  } catch (e) {
    logServerRouteException("POST /api/admin/disabled-users", e);
    return err(action === "archive" ? "Failed to archive user" : "Failed to restore user", 500);
  }
}
