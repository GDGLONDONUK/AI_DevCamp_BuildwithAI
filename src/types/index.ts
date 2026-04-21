export type UserRole = "admin" | "moderator" | "attendee";
export type UserStatus = "pending" | "participated" | "certified" | "not-certified" | "failed";

export interface AttendanceRecord {
  userId: string;
  [sessionId: string]: boolean | string; // session-1, session-2...
}

export interface UserProfile {
  /** Firebase Auth UID. Empty for pending (email-only) imports until they sign up. */
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  userStatus: UserStatus;
  registeredSessions: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  bio?: string;
  roleTitle?: string;
  city?: string;
  country?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  skills?: string[];
  expertise?: string[];
  wantToLearn?: string[];
  canOffer?: string[];
  /** Google Form free-text: prior experience with AI. */
  priorAIKnowledge?: string;
  /** Google Form: areas of interest. */
  areasOfInterest?: string;
  /** Google Form: why join. */
  whyJoin?: string;
  /** Google Form: from programming disclaimer. */
  knowsProgramming?: boolean;
  /** Google Form: commitment disclaimer. */
  commitment?: boolean;
  /** Google Form: role (Current Role) from CSV. */
  formRole?: string;
  /** Google Form. */
  yearsOfExperience?: string;
  /** When the Google Form was submitted (ISO or raw). */
  formSubmittedAt?: string;
  /** Same as form submission time when imported (ISO). */
  registeredAt?: string;
  /** When this profile row was first created in Firestore (import or sign-up). */
  importCreatedAt?: string;
  /** When a pending import was merged to this Auth-backed profile. */
  importLinkedAt?: string;
  /** Normalised tags from the `tags` catalog (e.g. prior-ai-knowledge). Optional alongside free-text fields. */
  priorAIKnowledgeTags?: string[];
  /** RSVP for the 23 Apr kick-off: in person (London) vs online only. */
  kickoffInPersonRsvp?: boolean;
  /** Human-readable; use with kickoffInPersonRsvp (e.g. from kickoffRsvp.joiningInPersonLabel). */
  joiningInPerson?: string;
  handle?: string;
  keepUpdated?: boolean;
  /** Submitted the Google Form (imported or matched at sign-up). */
  preRegistered?: boolean;
  /** Has a Firebase account (app sign-up complete). */
  registered?: boolean;
  /** Whether this row is linked to Firebase Auth. False = pending import, doc id = email. */
  signedIn?: boolean;
  /** How the account was first provisioned in Firestore (admin / tooling). */
  registrationSource?: "google" | "password";
  /**
   * Firebase Auth provider IDs, e.g. `google.com`, `password`. Synced on sign-in
   * so admins can see Google vs email/password (including accounts with both linked).
   */
  authProviders?: string[];
  /**
   * How the pending `users/{email}` row was created before first login, e.g. `csv`, `admin`.
   */
  importSource?: string;
  /** Set when a moderator created the row from admin before the user signed in. */
  createdByAdmin?: boolean;
  /**
   * Firestore document id when it differs from `uid` (e.g. email-keyed pending import).
   * Omitted in normal app reads; set when listing users in admin.
   */
  firestoreId?: string;
}

export interface Session {
  id: string;
  number: number;
  title: string;
  date: string;
  time: string;
  duration?: string;
  week: number;
  topic: string;
  description: string;
  speaker?: string;
  speakerTitle?: string;
  speakerPhoto?: string;
  tags?: string[];
  whatYouWillLearn?: string[];
  buildIdeas?: string[];
  resources?: Resource[];
  videoUrl?: string;
  resourcesFolderUrl?: string;
  isKickoff?: boolean;
  isClosing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  title: string;
  url: string;
}

/**
 * One document per category in the `tags` Firestore collection (doc id = `id`).
 * Used for dropdowns / filters; user documents may store free text (`priorAIKnowledge`)
 * and/or structured tag arrays (`priorAIKnowledgeTags`) aligned with `userField`.
 */
export interface TagCategoryDocument {
  id: string;
  label: string;
  /** Which field on `users` this category relates to (e.g. priorAIKnowledge, skills). */
  userField: string;
  values: string[];
  order: number;
  updatedAt?: string;
}

export interface Assignment {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  weekNumber: number;
  sessionId: string;
  title: string;
  description: string;
  githubUrl?: string;
  demoUrl?: string;
  notebookUrl?: string;
  submittedAt: Date | string;
  status: "submitted" | "reviewed" | "approved";
  feedback?: string;
  grade?: string;
}

export interface Project {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshotUrls?: string[];
  submittedAt: Date | string;
  status: "submitted" | "reviewed" | "shortlisted" | "winner";
  feedback?: string;
  weekCompleted: number;
}
