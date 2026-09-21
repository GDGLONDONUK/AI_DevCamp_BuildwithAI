/**
 * GET  /api/admin/preregistered  — list form-registered people (admin only) — from `users` with `preRegistered: true`
 * POST /api/admin/preregistered  — bulk-upsert pending import rows to `users/{email}` (admin only)
 *
 * Imports enrol people into the **active cohort** (September 2026). Existing Auth users
 * on the list are merged into that cohort (same as Join); new emails become pending
 * `users/{email}` until they register / sign in.
 */

import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { ok, err, requireAdmin } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { parseLocationFields } from "@/lib/locationCleanup";
import { formTimestampToIso } from "@/lib/formTimestamp";
import { userSnapshotToAdminProfile } from "@/lib/server/userAdminView";
import {
  resolveUserDocForImport,
  isLinkedProfile,
} from "@/lib/server/resolveUserDocForImport";
import { getActiveCohortId } from "@/lib/cohorts";
import type { UserProfile } from "@/types";

function cohortEnrolmentPatch(joinedAt?: string): Record<string, unknown> {
  const cohortId = getActiveCohortId();
  const at = joinedAt || new Date().toISOString();
  return {
    cohortIds: FieldValue.arrayUnion(cohortId),
    activeCohortId: cohortId,
    [`cohortParticipation.${cohortId}`]: {
      status: "participated",
      joinedAt: at,
      role: "attendee",
    },
  };
}

function normalizeImportPayload(u: Record<string, unknown>, email: string): Record<string, unknown> {
  const raw = String(u.formSubmittedAt ?? u.importCreatedAt ?? "").trim();
  const isoFromRaw = formTimestampToIso(raw);
  const isAlreadyIso = /^\d{4}-\d{2}-\d{2}T/.test(raw);
  const at = (isAlreadyIso ? raw : isoFromRaw) ?? u.registeredAt ?? u.importCreatedAt ?? raw;
  const atStr = typeof at === "string" && at ? at : new Date().toISOString();

  const locRaw =
    (typeof u.location === "string" && u.location.trim()) ||
    [u.city, u.country].filter(Boolean).join(", ");
  const { location, city, country } = parseLocationFields(String(locRaw || ""));

  const cohortId = getActiveCohortId();

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
    userStatus: "participated",
    /** Until they use the in-app kick-off flow after linking Auth */
    kickoffRsvpExplicitInApp: false,
    cohortIds: [cohortId],
    activeCohortId: cohortId,
    cohortParticipation: {
      ...(typeof u.cohortParticipation === "object" && u.cohortParticipation
        ? (u.cohortParticipation as Record<string, unknown>)
        : {}),
      [cohortId]: {
        status: "participated",
        joinedAt: atStr,
        role: "attendee",
      },
    },
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Already signed up: enrol into active cohort + refresh import metadata.
 * Does not wipe spring cohortIds / history.
 */
function linkedUserImportPatch(
  u: Record<string, unknown>,
  email: string
): Record<string, unknown> {
  const joining = String(
    u.joiningInPerson ?? "Registered (Luma / import)"
  ).slice(0, 500);
  const at =
    (typeof u.formSubmittedAt === "string" && u.formSubmittedAt) ||
    new Date().toISOString();
  const patch: Record<string, unknown> = {
    email,
    preRegistered: true,
    kickoffInPersonRsvp: u.kickoffInPersonRsvp !== false,
    joiningInPerson: joining,
    kickoffRsvpUpdatedAt: new Date().toISOString(),
    kickoffRsvpExplicitInApp: false,
    importSource: u.importSource ?? "luma",
    ...cohortEnrolmentPatch(at),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof u.displayName === "string" && u.displayName.trim()) {
    patch.displayName = u.displayName;
  }
  if (typeof u.formRole === "string" && u.formRole.trim()) {
    patch.formRole = u.formRole;
  }
  if (typeof u.roleTitle === "string" && u.roleTitle.trim()) {
    patch.roleTitle = u.roleTitle;
  }
  return patch;
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
    logServerRouteException("GET /api/admin/preregistered", e);
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

    const BATCH_SIZE = 80;
    const db = adminDb();

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const chunk = users.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const row of chunk) {
        const email = String((row as { email?: string }).email ?? "")
          .toLowerCase()
          .trim();
        if (!email || !email.includes("@")) continue;
        const rowObj = { ...row, email } as Record<string, unknown>;
        const { ref, existing } = await resolveUserDocForImport(db, email);
        if (!existing?.exists) {
          const normalized = normalizeImportPayload(rowObj, email);
          batch.set(ref, normalized, { merge: true });
        } else {
          const data = existing.data() as Record<string, unknown> | undefined;
          if (isLinkedProfile(data, ref.id)) {
            batch.set(ref, linkedUserImportPatch(rowObj, email), { merge: true });
          } else {
            const normalized = normalizeImportPayload(rowObj, email);
            batch.set(ref, normalized, { merge: true });
          }
        }
      }
      await batch.commit();
    }

    return ok({ upserted: users.length });
  } catch (e) {
    logServerRouteException("POST /api/admin/preregistered", e);
    return err("Failed to upsert form registration rows", 500);
  }
}
