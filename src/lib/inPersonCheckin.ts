/**
 * Legacy boolean on `attendance/{uid}` — treat `true` as {@link KICKOFF_JOINED_AS_FIELD} `"in-person"`.
 * New writes should use `kickoffJoinedAs` only.
 */
export const IN_PERSON_MAY23_2026_FIELD = "inPersonMay23_2026" as const;

/** Programme id for Kick Off (same session can be attended in person or online). */
export const KICKOFF_SESSION_ID = "session-1" as const;

/**
 * How someone joined Kick Off (session-1): venue vs stream. Stored on `attendance/{uid}`.
 * Session `session-1` boolean = attended; this field is the mode note.
 */
export const KICKOFF_JOINED_AS_FIELD = "kickoffJoinedAs" as const;

export type KickoffJoinedAs = "in-person" | "online";

export function resolveKickoffJoinedAs(
  row: Record<string, unknown> | undefined
): KickoffJoinedAs | null {
  if (!row) return null;
  const v = row[KICKOFF_JOINED_AS_FIELD];
  if (v === "in-person" || v === "online") return v;
  if (row[IN_PERSON_MAY23_2026_FIELD] === true) return "in-person";
  return null;
}
