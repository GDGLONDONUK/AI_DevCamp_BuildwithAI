/**
 * Programme session attendance helpers (Firestore `attendance/{uid}` vs scheduled session ids).
 */

/** True if any configured programme session id is explicitly marked attended. */
export function hasAttendedAnyProgramSession(
  attendance: Record<string, unknown>,
  programmeSessionIds: readonly string[]
): boolean {
  for (const id of programmeSessionIds) {
    if (attendance[id] === true) return true;
  }
  return false;
}
