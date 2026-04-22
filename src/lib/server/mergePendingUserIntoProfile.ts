import type { UserRecord } from "firebase-admin/auth";
import type { UserProfile, UserRole, UserStatus } from "@/types";

const FORM_FIELDS = [
  "formRole",
  "yearsOfExperience",
  "priorAIKnowledge",
  "areasOfInterest",
  "whyJoin",
  "formSubmittedAt",
  "registeredAt",
  "importCreatedAt",
  "joiningInPerson",
  "knowsProgramming",
  "commitment",
] as const;

const EXTRA_PROFILE: (keyof UserProfile)[] = [
  "roleTitle",
  "bio",
  "experienceLevel",
  "linkedinUrl",
  "githubUrl",
  "websiteUrl",
  "keepUpdated",
  "kickoffInPersonRsvp",
  "importSource",
  "createdByAdmin",
];

const ARRAY_FIELDS: (keyof UserProfile)[] = [
  "skills",
  "expertise",
  "wantToLearn",
  "canOffer",
  "priorAIKnowledgeTags",
];

const VALID_ROLES: UserRole[] = ["attendee", "moderator", "admin"];
const VALID_STATUS: UserStatus[] = [
  "pending",
  "participated",
  "certified",
  "not-certified",
  "failed",
];

/**
 * Merges a pending `users/{email}` row into the profile being created at first
 * sign-in (ensure-profile). Call after `userData` is seeded from Firebase Auth.
 */
export function applyPendingRowToEnsureProfileData(
  userData: Record<string, unknown>,
  pre: UserProfile,
  record: UserRecord,
  preLocation: { city: string; country: string; location: string }
): void {
  const src = pre as unknown as Record<string, unknown>;

  const recName = record.displayName?.trim();
  const preName = typeof src.displayName === "string" ? src.displayName.trim() : "";
  if (recName && recName !== "Anonymous") {
    userData.displayName = recName;
  } else if (preName) {
    userData.displayName = preName;
  } else {
    userData.displayName = recName || "Anonymous";
  }

  const authPhoto = record.photoURL || "";
  const prePhoto = typeof src.photoURL === "string" ? src.photoURL : "";
  userData.photoURL = authPhoto || prePhoto;

  if (pre.handle && String(pre.handle).trim()) {
    userData.handle = String(pre.handle)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
  }

  userData.city = preLocation.city || (typeof src.city === "string" ? src.city : "") || userData.city;
  userData.country =
    preLocation.country || (typeof src.country === "string" ? src.country : "") || userData.country;
  const loc = preLocation.location || (typeof pre.location === "string" ? pre.location : "");
  if (loc) {
    userData.location = loc;
  }

  for (const k of FORM_FIELDS) {
    if (src[k] !== undefined) {
      userData[k] = src[k];
    }
  }
  for (const k of EXTRA_PROFILE) {
    if (src[k] !== undefined) {
      userData[k] = src[k];
    }
  }
  for (const k of ARRAY_FIELDS) {
    const a = pre[k];
    if (Array.isArray(a) && a.length) {
      userData[k] = a;
    }
  }

  const r = pre.role;
  if (r && VALID_ROLES.includes(r as UserRole)) {
    userData.role = r;
  }
  const s = pre.userStatus;
  if (s && VALID_STATUS.includes(s as UserStatus)) {
    // Pre-reg rows no longer use "pending" as application gate; treat as approved access.
    userData.userStatus = s === "pending" ? "participated" : (s as UserStatus);
  }

  userData.preRegistered = true;
  userData.importLinkedAt = new Date().toISOString();
}
