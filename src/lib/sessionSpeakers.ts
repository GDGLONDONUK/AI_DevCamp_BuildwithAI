import type { Session, SessionSpeaker } from "@/types";

/**
 * Normalized speaker list for UI: uses `speakers` when present and non-empty,
 * otherwise a single legacy `speaker` / `speakerTitle` / `speakerPhoto` row.
 */
export function getSessionSpeakersList(session: Session): SessionSpeaker[] {
  const fromArr = session.speakers?.filter((s) => (s?.name ?? "").trim().length > 0);
  if (fromArr && fromArr.length > 0) {
    return fromArr.map((s) => ({
      name: s.name.trim(),
      title: s.title?.trim() || undefined,
      photo: s.photo?.trim() || undefined,
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
