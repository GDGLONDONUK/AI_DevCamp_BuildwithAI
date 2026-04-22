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

/**
 * True until the user has made an in-app kick-off choice (banner, /register, /register/kickoff).
 * Ignores legacy / import-only `kickoffInPersonRsvp` or `joiningInPerson` so bad imports still see the banner.
 */
export function userNeedsKickoffRsvp(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.kickoffRsvpExplicitInApp !== true;
}

/** Payload to merge into Firestore when saving kick-off RSVP. */
export function kickoffRsvpWritePayload(attendingInPerson: boolean): {
  kickoffInPersonRsvp: boolean;
  joiningInPerson: string;
  kickoffRsvpUpdatedAt: string;
  kickoffRsvpExplicitInApp: true;
} {
  const now = new Date().toISOString();
  return {
    kickoffInPersonRsvp: attendingInPerson,
    joiningInPerson: joiningInPersonLabel(attendingInPerson),
    kickoffRsvpUpdatedAt: now,
    kickoffRsvpExplicitInApp: true,
  };
}

/** sessionStorage: skip `/register` → `/dashboard` redirect while navigating to `/register/kickoff`. */
export const SESSION_SKIP_REGISTER_REDIRECT = "skipRegisterRedirectKickoff";
