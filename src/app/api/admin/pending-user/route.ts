/**
 * POST /api/admin/pending-user
 *
 * Creates or updates `users/{email}` as a pending row (signedIn: false). When that
 * person signs in with the same email, POST /api/me/ensure-profile merges into
 * `users/{uid}` and removes the email doc.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseLocationFields } from "@/lib/locationCleanup";
import { formTimestampToIso } from "@/lib/formTimestamp";

function normalizeEmail(raw: string): string | null {
  const e = raw.toLowerCase().trim();
  if (!e.includes("@")) return null;
  return e;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return err("Valid email is required");
    }

    const displayName = String(body.displayName ?? "")
      .trim()
      .slice(0, 500);
    const handleRaw = String(body.handle ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 40);

    const locRaw =
      (typeof body.location === "string" && body.location.trim()) ||
      [body.city, body.country].filter(Boolean).join(", ");
    const { location, city, country } = parseLocationFields(String(locRaw || ""));

    const rawTs = String(body.formSubmittedAt ?? body.importCreatedAt ?? "").trim();
    const isoFromRaw = formTimestampToIso(rawTs);
    const isAlreadyIso = /^\d{4}-\d{2}-\d{2}T/.test(rawTs);
    const at = (isAlreadyIso ? rawTs : isoFromRaw) || new Date().toISOString();

    const doc: Record<string, unknown> = {
      email,
      displayName: displayName || email.split("@")[0] || "User",
      uid: "",
      role: "attendee",
      userStatus: "participated",
      registeredSessions: [],
      photoURL: "",
      preRegistered: true,
      registered: false,
      signedIn: false,
      importSource: "admin",
      createdByAdmin: true,
      location,
      city,
      country,
      formRole: String(body.formRole ?? "Added by admin").trim().slice(0, 200) || "Added by admin",
      yearsOfExperience: String(body.yearsOfExperience ?? "").trim().slice(0, 200),
      priorAIKnowledge: String(body.priorAIKnowledge ?? "").trim().slice(0, 12000),
      areasOfInterest: String(body.areasOfInterest ?? "").trim().slice(0, 8000),
      whyJoin: String(body.whyJoin ?? "").trim().slice(0, 12000),
      joiningInPerson: String(body.joiningInPerson ?? "").trim().slice(0, 500),
      knowsProgramming: Boolean(body.knowsProgramming),
      commitment: body.commitment === true,
      kickoffRsvpExplicitInApp: false,
      formSubmittedAt: at,
      registeredAt: at,
      importCreatedAt: at,
      createdAt: at,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const roleIn = String(body.role ?? "").trim();
    if (roleIn === "admin" || roleIn === "moderator" || roleIn === "attendee") {
      doc.role = roleIn;
    }
    if (handleRaw) {
      doc.handle = handleRaw;
    }

    await adminDb().collection("users").doc(email).set(doc, { merge: true });

    return ok({ email, updated: true });
  } catch (e) {
    logServerRouteException("POST /api/admin/pending-user", e);
    return err("Failed to save pending user", 500);
  }
}
