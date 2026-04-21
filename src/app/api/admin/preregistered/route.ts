/**
 * GET  /api/admin/preregistered  — list form-registered people (admin only) — from `users` with `preRegistered: true`
 * POST /api/admin/preregistered  — bulk-upsert pending import rows to `users/{email}` (admin only)
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { parseLocationFields } from "@/lib/locationCleanup";
import { formTimestampToIso } from "@/lib/formTimestamp";
import { userSnapshotToAdminProfile } from "@/lib/server/userAdminView";
import type { UserProfile } from "@/types";

function normalizeImportPayload(u: Record<string, unknown>, email: string): Record<string, unknown> {
  const raw = String(u.formSubmittedAt ?? u.importCreatedAt ?? "").trim();
  const isoFromRaw = formTimestampToIso(raw);
  const isAlreadyIso = /^\d{4}-\d{2}-\d{2}T/.test(raw);
  const at = (isAlreadyIso ? raw : isoFromRaw) ?? u.registeredAt ?? u.importCreatedAt ?? raw;

  const locRaw =
    (typeof u.location === "string" && u.location.trim()) ||
    [u.city, u.country].filter(Boolean).join(", ");
  const { location, city, country } = parseLocationFields(String(locRaw || ""));

  return {
    ...u,
    email,
    location,
    city,
    country,
    formSubmittedAt: at,
    registeredAt: u.registeredAt ?? at,
    importCreatedAt: u.importCreatedAt ?? at,
    createdAt: u.createdAt ?? at,
    preRegistered: true,
    registered: false,
    signedIn: false,
    uid: "",
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const snap = await adminDb()
      .collection("users")
      .where("preRegistered", "==", true)
      .get();
    const users: UserProfile[] = snap.docs.map((d) => userSnapshotToAdminProfile(d));
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return ok(users);
  } catch (e) {
    console.error("GET /api/admin/preregistered", e);
    return err("Failed to fetch form-registered users", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const users: Record<string, unknown>[] = body.users;

    if (!Array.isArray(users) || users.length === 0) {
      return err("users array is required and must not be empty");
    }

    const BATCH_SIZE = 499;
    const db = adminDb();

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = users.slice(i, i + BATCH_SIZE);
      for (const row of chunk) {
        const email = String((row as { email?: string }).email ?? "")
          .toLowerCase()
          .trim();
        if (!email || !email.includes("@")) continue;
        const normalized = normalizeImportPayload(
          { ...row, email } as Record<string, unknown>,
          email
        );
        batch.set(db.collection("users").doc(email), normalized, { merge: true });
      }
      await batch.commit();
    }

    return ok({ upserted: users.length });
  } catch (e) {
    console.error("POST /api/admin/preregistered", e);
    return err("Failed to upsert form registration rows", 500);
  }
}
