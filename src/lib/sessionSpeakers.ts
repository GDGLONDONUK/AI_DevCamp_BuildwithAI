import type { Session, SessionSpeaker, Speaker } from "@/types";

/** Map roster documents to the display shape used on session cards. */
export function speakerRecordsToLookup(
  speakers: readonly Speaker[]
): Record<string, SessionSpeaker> {
  const out: Record<string, SessionSpeaker> = {};
  for (const s of speakers) {
    out[s.id] = {
      name: s.name,
      title: s.title,
      photo: s.photo,
      linkedinUrl: s.linkedinUrl,
    };
  }
  return out;
}

/**
 * Normalized speaker list for UI.
 * 1) When `session.speakerIds` is set and `lookup` resolves names → use that order.
 * 2) Else embedded `speakers[]` (legacy).
 * 3) Else legacy single `speaker` / `speakerTitle` / `speakerPhoto`.
 */
export function getSessionSpeakersList(
  session: Session,
  lookup?: Readonly<Record<string, SessionSpeaker>>
): SessionSpeaker[] {
  const ids = session.speakerIds?.filter((id) => id.trim().length > 0);
  if (ids && ids.length > 0 && lookup) {
    const resolved = ids
      .map((id) => lookup[id])
      .filter((x): x is SessionSpeaker => Boolean(x?.name?.trim()));
    if (resolved.length > 0) return resolved;
  }

  const fromArr = session.speakers?.filter((s) => (s?.name ?? "").trim().length > 0);
  if (fromArr && fromArr.length > 0) {
    return fromArr.map((s) => ({
      name: s.name.trim(),
      title: s.title?.trim() || undefined,
      photo: s.photo?.trim() || undefined,
      linkedinUrl: s.linkedinUrl?.trim() || undefined,
    }));
  }
  const name = session.speaker?.trim();
  if (name) {
    return [
      {
        name,
        title: session.speakerTitle?.trim() || undefined,
        photo: session.speakerPhoto?.trim() || undefined,
      },
    ];
  }
  return [];
}
