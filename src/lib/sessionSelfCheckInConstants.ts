/** Firestore collection: one doc per session id; not readable by attendees (admin/moderator only). */
export const SESSION_SELF_CHECKIN_COLLECTION = "session_self_checkin";

/** Map on `attendance/{uid}`: sessionId → audit metadata (not a session attendance boolean). */
export const SESSION_ATTENDANCE_AUDIT_KEY = "sessionAttendanceAudit";
