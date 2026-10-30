/**
 * Admin attendance. Call only after requireAdmin / requireAdminOrSelf.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { attendancePatchWithAudit } from "@/lib/attendanceAudit";
import { sessionCohortId } from "@/lib/server/sessionCohortAccess";
import { sessionLooksCancelled } from "@/lib/server/sessionCancelled";
import { AdminOpError } from "@/lib/server/admin/errors";
import { serializeDoc } from "@/lib/server/admin/serialize";
import { resolveUserDoc } from "@/lib/server/admin/resolveUserDoc";

export async function getAdminAttendance(uidOrEmail: string) {
  const user = await resolveUserDoc(uidOrEmail);
  const attUid = user?.id || uidOrEmail.trim();
  const snap = await adminDb().collection("attendance").doc(attUid).get();
  return {
    uid: attUid,
    email: user?.data()?.email ?? null,
    exists: snap.exists,
    source: "firestore attendance/{uid}",
    attendance: snap.exists ? serializeDoc(snap.id, snap.data()!) : {},
  };
}

export async function setAdminAttendance(opts: {
  uidOrEmail: string;
  sessionId: string;
  attended: boolean;
  actorUid: string;
  force?: boolean;
}) {
  const user = await resolveUserDoc(opts.uidOrEmail);
  const uid = user?.id || opts.uidOrEmail.trim();
  if (!user?.exists) {
    const direct = await adminDb().collection("users").doc(uid).get();
    if (!direct.exists) throw new AdminOpError(`User not found: ${opts.uidOrEmail}`, 404);
  }

  const sessionSnap = await adminDb().collection("sessions").doc(opts.sessionId).get();
  if (!sessionSnap.exists) throw new AdminOpError(`Session not found: ${opts.sessionId}`, 404);
  const sessionData = sessionSnap.data()!;
  const cancelled = sessionLooksCancelled(
    String(sessionData.title ?? ""),
    sessionData.tags
  );
  if (cancelled && !opts.force) {
    throw new AdminOpError(
      `Session ${opts.sessionId} looks cancelled — pass force=true to mark anyway`,
      400
    );
  }
  const cohortId = sessionCohortId(sessionData);

  const ref = adminDb().collection("attendance").doc(uid);
  const existing = await ref.get();
  const existingData = existing.exists
    ? (existing.data() as Record<string, unknown>)
    : undefined;

  await ref.set(
    {
      ...attendancePatchWithAudit(opts.sessionId, opts.attended, opts.actorUid, "admin", existingData, {
        cohortId,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const updated = await ref.get();
  return {
    uid,
    sessionId: opts.sessionId,
    attended: opts.attended,
    cohortId,
    attendance: updated.exists ? serializeDoc(updated.id, updated.data()!) : {},
  };
}
