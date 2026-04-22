import type { UserProfile } from "@/types";

/** True for venue planning: user chose “in person” in the app and confirmed the kick-off gate. */
export function isKickoffInPersonInApp(u: UserProfile): boolean {
  return u.kickoffInPersonRsvp === true && u.kickoffRsvpExplicitInApp === true;
}

/**
 * “Broad” in-person match: in-app boolean yes, or legacy/form text (e.g. “yes” in `joiningInPerson`).
 * High counts often include pre-form / import text — use `isKickoffInPersonInApp` for capacity-style counts.
 */
export function userMatchesInPersonLooseRsvp(u: UserProfile): boolean {
  if (u.kickoffInPersonRsvp === true) return true;
  const j = (u.joiningInPerson || "").toLowerCase().trim();
  if (j.startsWith("y")) return true;
  if (j.includes("in person") || j.includes("in-person")) return true;
  return false;
}

export function kickoffRsvpAdminAuditFields(admin: {
  uid: string;
  email: string;
  name?: string;
}): {
  kickoffRsvpSetBy: "admin";
  kickoffRsvpSetByAdminUid: string;
  kickoffRsvpSetByAdminEmail: string;
  kickoffRsvpSetByAdminName: string | null;
} {
  return {
    kickoffRsvpSetBy: "admin",
    kickoffRsvpSetByAdminUid: admin.uid,
    kickoffRsvpSetByAdminEmail: admin.email,
    kickoffRsvpSetByAdminName: admin.name?.trim() || null,
  };
}

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
  kickoffRsvpSetBy: "app";
  kickoffRsvpSetByAdminUid: null;
  kickoffRsvpSetByAdminEmail: null;
  kickoffRsvpSetByAdminName: null;
} {
  const now = new Date().toISOString();
  return {
    kickoffInPersonRsvp: attendingInPerson,
    joiningInPerson: joiningInPersonLabel(attendingInPerson),
    kickoffRsvpUpdatedAt: now,
    kickoffRsvpExplicitInApp: true,
    kickoffRsvpSetBy: "app",
    kickoffRsvpSetByAdminUid: null,
    kickoffRsvpSetByAdminEmail: null,
    kickoffRsvpSetByAdminName: null,
  };
}

/** sessionStorage: skip `/register` → `/dashboard` redirect while navigating to `/register/kickoff`. */
export const SESSION_SKIP_REGISTER_REDIRECT = "skipRegisterRedirectKickoff";
