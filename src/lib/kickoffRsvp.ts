import type { UserProfile } from "@/types";

/** Maximum in-person guests for the 23 April kick-off (venue capacity). */
export const KICKOFF_IN_PERSON_MAX_CAPACITY = 75;

/**
 * User-facing copy: confirm attendance, capacity limit, RSVP requirement, and entry policy.
 * Use anywhere we ask for in-person vs online kick-off RSVP.
 */
export const KICKOFF_IN_PERSON_RSVP_POLICY =
  `Please confirm whether you are coming to the 23 April kick-off in person. The venue has a maximum capacity of ${KICKOFF_IN_PERSON_MAX_CAPACITY} in-person guests. ` +
  "If you plan to attend in person, you must RSVP below. If the venue is at full capacity, we reserve the right to refuse entry.";

/** Stored on `users.joiningInPerson` — admin filters use `.toLowerCase().startsWith("y")` for in-person. */
export function joiningInPersonLabel(attendingInPerson: boolean): string {
  return attendingInPerson
    ? "Yes — 23 Apr kick-off in person (RSVP)"
    : "Online only";
}

/** True if the user has not yet chosen in-person vs online for the 23 Apr kick-off. */
export function userNeedsKickoffRsvp(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return typeof profile.kickoffInPersonRsvp !== "boolean";
}

/** Payload to merge into Firestore when saving kick-off RSVP. */
export function kickoffRsvpWritePayload(attendingInPerson: boolean): {
  kickoffInPersonRsvp: boolean;
  joiningInPerson: string;
  kickoffRsvpUpdatedAt: string;
} {
  const now = new Date().toISOString();
  return {
    kickoffInPersonRsvp: attendingInPerson,
    joiningInPerson: joiningInPersonLabel(attendingInPerson),
    kickoffRsvpUpdatedAt: now,
  };
}

/** sessionStorage: skip `/register` → `/dashboard` redirect while navigating to `/register/kickoff`. */
export const SESSION_SKIP_REGISTER_REDIRECT = "skipRegisterRedirectKickoff";
