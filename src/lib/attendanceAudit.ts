import type { AttendanceMarkSource, SessionAttendanceAuditEntry } from "@/types";
import { SESSION_ATTENDANCE_AUDIT_KEY } from "@/lib/sessionSelfCheckInConstants";

export function getSessionAttendanceAudit(
  row: Record<string, unknown> | undefined
): Record<string, SessionAttendanceAuditEntry> | undefined {
  const v = row?.[SESSION_ATTENDANCE_AUDIT_KEY];
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  return v as Record<string, SessionAttendanceAuditEntry>;
}

export type AttendanceAuditOptions = {
  /** Cohort of the session being marked (for multi-cohort attendance reports). */
  cohortId?: string;
};

/** Build Firestore merge payload for session boolean + audit map entry. */
export function attendancePatchWithAudit(
  sessionId: string,
  attended: boolean,
  actorUid: string,
  source: AttendanceMarkSource,
  existingRow: Record<string, unknown> | undefined,
  opts?: AttendanceAuditOptions
): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  const prevMap = getSessionAttendanceAudit(existingRow) ?? {};
  const prev = prevMap[sessionId];
  const cohortId = opts?.cohortId?.trim() || prev?.cohortId;

  const nextAudit: Record<string, SessionAttendanceAuditEntry> = { ...prevMap };

  if (!attended) {
    if (prev) {
      nextAudit[sessionId] = {
        ...prev,
        updatedBy: actorUid,
        updatedAt: nowIso,
        ...(cohortId ? { cohortId } : {}),
      };
    } else {
      delete nextAudit[sessionId];
    }
  } else {
    nextAudit[sessionId] = {
      createdBy: prev?.createdBy ?? actorUid,
      updatedBy: actorUid,
      createdAt: prev?.createdAt ?? nowIso,
      updatedAt: nowIso,
      source: prev?.source ?? source,
      ...(cohortId ? { cohortId } : {}),
    };
  }

  return {
    [sessionId]: attended,
    [SESSION_ATTENDANCE_AUDIT_KEY]: nextAudit,
  };
}
