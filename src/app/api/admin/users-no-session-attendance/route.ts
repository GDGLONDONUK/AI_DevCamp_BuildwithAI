/**
 * GET /api/admin/users-no-session-attendance
 *
 * Lists `users/{uid}` profiles (real Auth-backed rows only — skips `users/{email}` pending imports)
 * where the user has never attended any configured programme session (`SESSIONS` ids on `attendance/{uid}`).
 *
 * Admin only.
 */

import { NextRequest } from "next/server";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { SESSIONS } from "@/data/sessions";
import { hasAttendedAnyProgramSession } from "@/lib/server/programSessionAttendance";

const SESSION_IDS = SESSIONS.map((s) => s.id);
const ATT_READ_CHUNK = 10;

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "admin") {
    return err("Forbidden — only admins can run this report", 403);
  }

  try {
    const db = adminDb();
    const usersSnap = await db.collection("users").get();

    const uidDocs = usersSnap.docs.filter((d) => !d.id.includes("@"));

    const attendanceRefs = uidDocs.map((d) => db.collection("attendance").doc(d.id));
    const attSnapshots: DocumentSnapshot[] = [];

    for (let i = 0; i < attendanceRefs.length; i += ATT_READ_CHUNK) {
      const slice = attendanceRefs.slice(i, i + ATT_READ_CHUNK);
      const batch = await db.getAll(...slice);
      attSnapshots.push(...batch);
    }

    const attendanceByUid = new Map<string, Record<string, unknown>>();
    for (const snap of attSnapshots) {
      attendanceByUid.set(snap.id, snap.exists ? (snap.data() as Record<string, unknown>) : {});
    }

    const neverAttended = [];

    for (const doc of uidDocs) {
      const data = doc.data() as Record<string, unknown>;
      const role = data.role as string | undefined;
      if (role === "admin" || role === "moderator") continue;

      const att = attendanceByUid.get(doc.id) ?? {};
      if (!hasAttendedAnyProgramSession(att, SESSION_IDS)) {
        neverAttended.push({
          uid: doc.id,
          firestoreId: doc.id,
          email: data.email ?? "",
          displayName: data.displayName ?? "",
          role: data.role ?? "attendee",
          userStatus: data.userStatus,
        });
      }
    }

    neverAttended.sort((a, b) =>
      String(a.displayName || a.email).localeCompare(String(b.displayName || b.email), undefined, {
        sensitivity: "base",
      })
    );

    return ok({
      programmeSessionIds: SESSION_IDS,
      count: neverAttended.length,
      users: neverAttended,
    });
  } catch (e) {
    logServerRouteException("GET /api/admin/users-no-session-attendance", e);
    return err("Failed to build report", 500);
  }
}
