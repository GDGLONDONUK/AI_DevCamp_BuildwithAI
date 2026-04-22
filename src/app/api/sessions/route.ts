/**
 * GET  /api/sessions  — list all sessions (public)
 * POST /api/sessions  — create a new session (admin/moderator only)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, created, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const snap = await adminDb()
      .collection("sessions")
      .orderBy("number", "asc")
      .get();

    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ok(sessions);
  } catch (e) {
    logServerRouteException("GET /api/sessions", e);
    return err("Failed to fetch sessions", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return err("Session id is required");
    if (!fields.title) return err("title is required");
    if (typeof fields.number !== "number") return err("number must be a number");

    const now = new Date().toISOString();
    const sessionData = { ...fields, id, createdAt: now, updatedAt: now };

    await adminDb().collection("sessions").doc(id).set(sessionData);
    return created({ id, ...sessionData });
  } catch (e) {
    logServerRouteException("POST /api/sessions", e);
    return err("Failed to create session", 500);
  }
}
