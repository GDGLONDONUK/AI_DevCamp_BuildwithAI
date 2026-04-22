# 03 · Database Schema

We use **Cloud Firestore** — a NoSQL document database. Data is organised into **collections** (like folders) containing **documents** (like JSON objects).

---

## Collections overview

```
Firestore
├── users/          ← One document per registered user (or pending `users/{email}`)
├── sessions/       ← One document per DevCamp session
├── attendance/     ← One document per user, tracks which sessions they attended
├── assignments/    ← One document per submitted weekly assignment
├── projects/       ← One document per submitted final project
├── tags/           ← Tag categories for forms (seeded via `POST /api/admin/tags`)
└── error_logs/     ← Client and server errors (written only through Admin SDK / API; browse in `/admin/errors`)
```

---

## `users/{uid}`

Document ID = Firebase Auth UID (same for every user across the whole system).

```ts
{
  // Identity
  uid:              string          // Firebase Auth UID
  email:            string          // e.g. "jane@example.com"
  displayName:      string          // Full name
  photoURL?:        string          // Avatar URL (Firebase Storage or Google)
  handle?:          string          // Unique @handle (lowercase, no spaces)

  // Access control — only admins/mods can change these two fields
  role:             "admin" | "moderator" | "attendee"
  userStatus:       "pending" | "participated" | "certified" | "not-certified" | "failed"

  // Profile
  bio?:             string
  roleTitle?:       string          // e.g. "Data Engineer @ Acme"
  city?:            string
  country?:         string
  location?:        string          // Derived: "city, country" — stored for display convenience
  experienceLevel?: "beginner" | "intermediate" | "advanced"
  linkedinUrl?:     string
  githubUrl?:       string
  websiteUrl?:      string

  // Skills (string arrays — chosen from presets in src/data/tags.ts or custom)
  skills?:          string[]        // Programming languages & tools
  expertise?:       string[]        // Domain expertise (ML, DevOps, etc.)
  wantToLearn?:     string[]        // Topics the user wants to learn
  canOffer?:        string[]        // Ways the user can help others

  // Kick-off (e.g. 23 April) — in person vs online
  kickoffInPersonRsvp?: boolean      // true = in person, false = online / not in person
  kickoffRsvpUpdatedAt?: string      // ISO 8601 when RSVP last changed
  joiningInPerson?: string            // Human-readable label (form, CSV, admin; see lib/kickoffRsvp.ts)

  // Misc
  registeredSessions: string[]      // Legacy field — no longer used for session access
  keepUpdated?:     boolean         // Newsletter / updates opt-in
  createdAt:        Timestamp       // Set once at registration via serverTimestamp()
  updatedAt:        Timestamp       // Updated on every profile save

  // Pre-registration & imports (optional)
  preRegistered?:   boolean         // Matched a form import or pending row
  registered?:     boolean
  signedIn?:       boolean         // false = pending import not yet linked to Auth
  registrationSource?: "google" | "password"  // How the account was first created (legacy + ensure-profile)
  authProviders?:  string[]       // e.g. ["google.com", "password"] — synced from Firebase on sign-in
  importSource?:   string         // e.g. "admin", "csv" — how a pending row was created
  createdByAdmin?: boolean         // Row added from admin “Add pending user” before first login
  importLinkedAt?:  string         // ISO time when a pending row was merged into users/{uid}
  firestoreId?:    string         // In admin list views: doc id when it differs from uid (email-keyed pending)
  // ... plus form import fields: formRole, yearsOfExperience, areasOfInterest, whyJoin, etc.
}
```

### Pending user rows — `users/{email}`

Some documents use the **user’s email** as the document id (lowercase) while they are **not** yet linked to Firebase Auth: **pending** CSV/form imports, or **Add pending user** from admin. Conventions:

- `signedIn: false` (and often `preRegistered: true` for list queries).
- `uid: ""` until merged.
- On **first sign-in** with the same email, `POST /api/me/ensure-profile` creates `users/{uid}`, **merges** fields from the email document, and **deletes** `users/{email}`.

See [08-site-deployment-and-admin.md](./08-site-deployment-and-admin.md).

### User status lifecycle

```
Registration → pending
                 │
        Admin reviews
                 │
    ┌────────────┼──────────────┐
    ▼            ▼              ▼
participated  certified    not-certified
                              │
                           failed
```

---

## `sessions/{sessionId}`

Document ID = `session-1`, `session-2`, … (set by admin at creation).

```ts
{
  id:                 string        // e.g. "session-1"
  number:             number        // Display order (1, 2, 3…)
  title:              string        // e.g. "Kick Off"
  topic:              string        // Theme/topic line
  description:        string        // Full summary paragraph
  week:               number        // Programme week (1–4)
  date:               string        // Human-readable: "23 April 2026"
  time:               string        // "6:00 PM – 9:00 PM"
  duration?:          string        // "3 hours"

  // Speaker
  speaker?:           string        // Speaker full name
  speakerTitle?:      string        // Job title / company
  speakerPhoto?:      string        // Photo URL

  // Content
  tags?:              string[]      // Topic tags, e.g. ["Python", "Beginner"]
  whatYouWillLearn?:  string[]      // Bullet list of learning outcomes
  buildIdeas?:        string[]      // Suggested mini-projects
  resources?:         Resource[]    // { title: string, url: string }[]

  // Post-session links (filled in after the session happens)
  videoUrl?:          string        // Recording (YouTube, Google Drive, Loom)
  resourcesFolderUrl?: string       // Shared Google Drive folder

  // Flags
  isKickoff?:         boolean
  isClosing?:         boolean

  createdAt?:         string        // ISO string
  updatedAt?:         string        // ISO string — updated on every save
}
```

---

## `attendance/{uid}`

Document ID = Firebase Auth UID (one per user). Each field is a session ID mapped to a boolean.

```ts
{
  "session-1": true,   // attended
  "session-2": false,  // did not attend
  "session-3": true,
  // ... one key per session
}
```

This is a flat, sparse document — if a key doesn't exist the attendance is treated as `false`. Admins toggle these via the Attendance tab.

---

## `assignments/{autoId}`

Document ID = auto-generated by Firestore.

```ts
{
  // Who submitted it
  userId:       string        // Firebase Auth UID
  userEmail:    string
  userName:     string

  // What was submitted
  weekNumber:   number        // 1–4
  sessionId:    string        // e.g. "session-2"
  title:        string
  description:  string
  githubUrl?:   string
  notebookUrl?: string        // Google Colab / Jupyter link
  demoUrl?:     string

  // Review
  status:       "submitted" | "reviewed" | "approved"
  feedback?:    string        // Admin feedback text
  grade?:       string        // Optional grade

  submittedAt:  Timestamp
}
```

---

## `projects/{autoId}`

Document ID = auto-generated by Firestore.

```ts
{
  // Who submitted it
  userId:       string
  userEmail:    string
  userName:     string

  // What was submitted
  title:        string
  description:  string
  techStack:    string[]      // e.g. ["Python", "TensorFlow", "Flask"]
  githubUrl?:   string
  demoUrl?:     string
  screenshotUrls?: string[]

  weekCompleted: number       // Which week the project covers

  // Review
  status:       "submitted" | "reviewed" | "shortlisted" | "winner" | "passed"
  feedback?:    string

  submittedAt:  Timestamp
}
```

---

## `tags/{categoryId}`

Tag catalog used on registration and profile (prior knowledge, etc.). **GET** `/api/tags` returns categories for the client; **POST** `/api/admin/tags` with `{ "action": "seed" }` writes the preset catalog. See `src/data/tagCatalog.ts` and `TagCategoryDocument` in `src/types/index.ts`.

---

## `error_logs/{autoId}`

Automatic error log entries (React boundaries, `POST /api/log-error`, server route exceptions). The collection is **only** written server-side. Admins use **`/admin/errors`** and **GET** `/api/admin/error-logs`. See `AppErrorLog` in `src/types/index.ts`.

---

## Composite indexes

Firestore needs compound indexes for queries that filter and sort on different fields simultaneously.

| Collection | Query | Index |
|-----------|-------|-------|
| `assignments` | filter by `userId`, sort by `submittedAt` desc | `userId ASC + submittedAt DESC` |
| `projects` | filter by `userId`, sort by `submittedAt` desc | `userId ASC + submittedAt DESC` |

These are defined in `firestore.indexes.json` and deployed with `firebase deploy --only firestore:indexes`.

---

## Data relationships (no joins — it's NoSQL)

Firestore doesn't have SQL joins. Instead we:

1. **Denormalise** — store `userName` and `userEmail` directly on assignments/projects so we don't need to look up the user separately.
2. **Use separate collections** — attendance is its own collection keyed by UID so it can be updated without touching the user document.
3. **Read in parallel** — when the admin page loads, it calls `Promise.all([fetchUsers(), fetchAssignments(), ...])` to load everything at once.

---

Next → [04-auth-and-security.md](./04-auth-and-security.md)
