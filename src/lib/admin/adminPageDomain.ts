/**
 * Pure admin-console domain rules (users, pre-reg, kick-off RSVP filters).
 * Keeps `admin/page.tsx` focused on UI and data loading.
 */

import type { UserProfile } from "@/types";
import {
  isKickoffInPersonInApp,
  userMatchesInPersonLooseRsvp,
} from "@/lib/kickoffRsvp";
import { canonicalPreRegEmail } from "@/lib/admin/emailIdentity";

export type AdminConsoleTab =
  | "attendance"
  | "users"
  | "assignments"
  | "projects"
  | "sessions"
  | "preregistered";

export interface AttendanceMap {
  [userId: string]: Record<string, boolean | string>;
}

export function userDocKey(u: UserProfile): string {
  return u.firestoreId || u.uid;
}

/** False for pending email-only imports; true once Firebase Auth profile exists. */
export function hasAuthAccount(u: UserProfile): boolean {
  if (u.signedIn === false) return false;
  return Boolean(u.uid);
}

export function getPreRegDuplicateInfo(users: UserProfile[]): {
  duplicateKeys: Set<string>;
  nKeys: number;
  nRows: number;
} {
  const by = new Map<string, UserProfile[]>();
  for (const u of users) {
    const k = canonicalPreRegEmail(u.email);
    if (!k) continue;
    const list = by.get(k) ?? [];
    list.push(u);
    by.set(k, list);
  }
  const duplicateKeys = new Set<string>();
  let nRows = 0;
  for (const [k, list] of by) {
    if (list.length > 1) {
      duplicateKeys.add(k);
      nRows += list.length;
    }
  }
  return { duplicateKeys, nKeys: duplicateKeys.size, nRows };
}

export type KickoffRsvpFilter =
  | "all"
  | "inPerson"
  | "inPersonInApp"
  | "inPersonSetByAdmin"
  | "online"
  | "notSet"
  | "inPersonAdminConfirmed";

export function userMatchesKickoffRsvpFilter(u: UserProfile, f: KickoffRsvpFilter): boolean {
  if (f === "all") return true;
  if (f === "inPersonAdminConfirmed") {
    return u.kickoffInPersonAdminConfirmed === true;
  }
  const r = u.kickoffInPersonRsvp;
  if (f === "notSet") return typeof r !== "boolean";
  if (f === "inPersonInApp") {
    return isKickoffInPersonInApp(u) && u.kickoffInPersonRsvp === true;
  }
  if (f === "inPersonSetByAdmin") {
    return u.kickoffRsvpSetBy === "admin" && u.kickoffInPersonRsvp === true;
  }
  if (f === "inPerson") {
    return userMatchesInPersonLooseRsvp(u);
  }
  if (f === "online") {
    if (typeof r === "boolean") return !r;
    return (u.joiningInPerson || "").toLowerCase().includes("online");
  }
  return true;
}

/** One-line label for the Users grid / table (23 Apr kick-off). */
export function kickoffRsvpLabelForAdmin(u: UserProfile): string {
  if (isKickoffInPersonInApp(u)) {
    return u.kickoffInPersonRsvp ? "In person (in-app ✓)" : "Online (in-app ✓)";
  }
  if (u.kickoffInPersonRsvp === true) {
    return "In person (data, not in-app confirm)";
  }
  if (u.kickoffInPersonRsvp === false) {
    return "Online (boolean)";
  }
  if (userMatchesInPersonLooseRsvp(u)) {
    return "In person* (broad: form / import only)";
  }
  return "—";
}
