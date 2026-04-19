/**
 * GET  /api/admin/preregistered  — list all pre-registered users (admin only)
 * POST /api/admin/preregistered  — bulk-upsert pre-registered users (admin only)
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { parseLocationFields } from "@/lib/locationCleanup";
import { PreRegisteredUser } from "@/types";

function normalizePreRegisteredLocation(u: PreRegisteredUser): PreRegisteredUser {
  const raw =
    (u.location && u.location.trim()) ||
    [u.city, u.country].filter(Boolean).join(", ");
  const { location, city, country } = parseLocationFields(raw || "");
  return { ...u, location, city, country };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const snap = await adminDb().collection("preRegistered").get();
    const users = snap.docs.map((d) => d.data() as PreRegisteredUser);
    return ok(users);
  } catch (e) {
    console.error("GET /api/admin/preregistered", e);
    return err("Failed to fetch pre-registered users", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const users: PreRegisteredUser[] = body.users;

    if (!Array.isArray(users) || users.length === 0) {
      return err("users array is required and must not be empty");
    }

    const BATCH_SIZE = 499;
    const db = adminDb();

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = users.slice(i, i + BATCH_SIZE);
      for (const u of chunk) {
        const id = u.email.toLowerCase().trim();
        const normalized = normalizePreRegisteredLocation({ ...u, email: id });
        batch.set(db.collection("preRegistered").doc(id), normalized, { merge: true });
      }
      await batch.commit();
    }

    return ok({ upserted: users.length });
  } catch (e) {
    console.error("POST /api/admin/preregistered", e);
    return err("Failed to upsert pre-registered users", 500);
  }
}
