/** Stored on `users.joiningInPerson` — admin filters use `.toLowerCase().startsWith("y")` for in-person. */
export function joiningInPersonLabel(attendingInPerson: boolean): string {
  return attendingInPerson
    ? "Yes — 23 Apr kick-off in person (RSVP)"
    : "Online only";
}

/** sessionStorage: skip `/register` → `/dashboard` redirect while navigating to `/register/kickoff`. */
export const SESSION_SKIP_REGISTER_REDIRECT = "skipRegisterRedirectKickoff";
