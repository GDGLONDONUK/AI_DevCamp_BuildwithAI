export type UserRole = "admin" | "moderator" | "attendee";
export type UserStatus = "pending" | "participated" | "certified" | "not-certified" | "failed";

export interface AttendanceRecord {
  userId: string;
  [sessionId: string]: boolean | string; // session-1, session-2...
}

export interface UserProfile {
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
  /** Normalised tags from the `tags` catalog (e.g. prior-ai-knowledge). Optional alongside free-text fields. */
  priorAIKnowledgeTags?: string[];
  /** RSVP for the 23 Apr kick-off: in person (London) vs online only. */
  kickoffInPersonRsvp?: boolean;
  /** Human-readable; use with kickoffInPersonRsvp (e.g. from kickoffRsvp.joiningInPersonLabel). */
  joiningInPerson?: string;
  handle?: string;
  keepUpdated?: boolean;
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

export interface PreRegisteredUser {
  email: string;
  displayName: string;
  formSubmittedAt: string;
  formRole: string;
  yearsOfExperience: string;
  priorAIKnowledge: string;
  areasOfInterest: string;
  whyJoin: string;
  knowsProgramming: boolean;
  joiningInPerson: string;
  location: string;
  city: string;
  country: string;
  commitment: boolean;
  linkedUid?: string;
  linkedAt?: string;
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
