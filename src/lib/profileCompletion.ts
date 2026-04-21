import { UserProfile } from "@/types";

export interface ProfileCompletionField {
  key: string;
  label: string;
  hint: string;
  check: (p: UserProfile) => boolean;
  section?: string;
}

export const PROFILE_COMPLETION_FIELDS: ProfileCompletionField[] = [
  {
    key: "displayName",
    label: "Full name",
    hint: "Add your name so others know who you are",
    check: (p) => Boolean(p.displayName?.trim()),
    section: "displayName",
  },
  {
    key: "bio",
    label: "Bio",
    hint: "Tell the community about your background and goals",
    check: (p) => Boolean(p.bio && p.bio.trim().length >= 20),
    section: "bio",
  },
  {
    key: "location",
    label: "Location",
    hint: "Add your city and country",
    check: (p) => Boolean(p.city || p.country),
    section: "location",
  },
  {
    key: "experienceLevel",
    label: "Experience level",
    hint: "Let us know your AI experience level",
    check: (p) => Boolean(p.experienceLevel),
    section: "experience",
  },
  {
    key: "skills",
    label: "Programming skills",
    hint: "Add at least one skill you know",
    check: (p) => Array.isArray(p.skills) && p.skills.length > 0,
    section: "skills",
  },
  {
    key: "expertise",
    label: "Domain expertise",
    hint: "Share your domain knowledge area",
    check: (p) => Array.isArray(p.expertise) && p.expertise.length > 0,
    section: "skills",
  },
  {
    key: "wantToLearn",
    label: "Learning goals",
    hint: "What do you want to learn at AI DevCamp?",
    check: (p) => Array.isArray(p.wantToLearn) && p.wantToLearn.length > 0,
    section: "learning",
  },
  {
    key: "canOffer",
    label: "What you can offer",
    hint: "How can you help other attendees?",
    check: (p) => Array.isArray(p.canOffer) && p.canOffer.length > 0,
    section: "learning",
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn",
    hint: "Connect professionally with other attendees",
    check: (p) => Boolean(p.linkedinUrl?.trim()),
    section: "links",
  },
  {
    key: "githubUrl",
    label: "GitHub",
    hint: "Show your code to the community",
    check: (p) => Boolean(p.githubUrl?.trim()),
    section: "links",
  },
];

export function calcProfileCompletion(profile: UserProfile) {
  const done = PROFILE_COMPLETION_FIELDS.filter((f) => f.check(profile));
  const pct = Math.round((done.length / PROFILE_COMPLETION_FIELDS.length) * 100);
  const missing = PROFILE_COMPLETION_FIELDS.filter((f) => !f.check(profile));
  return { pct, done: done.length, total: PROFILE_COMPLETION_FIELDS.length, missing };
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return calcProfileCompletion(profile).pct === 100;
}
