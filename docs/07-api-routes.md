# 07 · API Routes

The application exposes a REST API under `/api`. All routes are implemented as **Next.js Route Handlers** (`src/app/api/**`), run on the server, and use the **Firebase Admin SDK** to talk to Firestore — bypassing client-side security rules and keeping privileged operations server-side.

---

## Setup

### 1. Service Account credentials

API routes use the Firebase Admin SDK, which requires a service account key. These are **server-side only** — never exposed to the browser.

1. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
2. Click **Generate New Private Key** — downloads a JSON file
3. Copy the three values into your environment:

```bash
# .env.local (and Vercel environment variables for production)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

> ⚠️ The private key must have literal `\n` — not actual newlines — when stored in an env var. The `firebase-admin.ts` initialisation handles the replacement.

### 2. Authentication

All protected endpoints require a Firebase **ID token** in the `Authorization` header:

```
Authorization: Bearer <idToken>
```

Get the ID token client-side:
```ts
import { getAuth } from "firebase/auth";
const token = await getAuth().currentUser?.getIdToken();
```

---

## Shared response shape

Every response is JSON with a consistent envelope:

```json
// Success
{ "ok": true,  "data": { ... } }

// Error
{ "ok": false, "error": "Human-readable message" }
```

### Request body validation

Several mutating handlers validate JSON bodies with **Zod** before touching Firestore: invalid JSON returns `400` with `"Invalid JSON body"`; schema failures return `400` with a short, field-oriented message. Shared helper: `src/lib/api/parseJsonBody.ts`; schemas: `src/lib/api/schemas/requestBodies.ts`. Extend these patterns when adding new POST/PATCH routes.

---

## Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/public/handle-available?h=yourhandle` | Returns `{ available: true \| false }` for registration. Uses Admin SDK so it works **before** sign-in (client Firestore rules block anonymous reads of `users/*`). Handle must match `[a-z0-9_]{2,32}`. |

### Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/sessions` | Public | List all sessions ordered by session number |
| `POST` | `/api/sessions` | Admin / Moderator | Create a new session |
| `GET` | `/api/sessions/[id]` | Public | Get a single session |
| `PUT` | `/api/sessions/[id]` | Admin / Moderator | Fully replace a session (merge: true) |
| `DELETE` | `/api/sessions/[id]` | Admin / Moderator | Delete a session |

**POST / PUT body:**
```json
{
  "id": "session-1",
  "number": 1,
  "title": "Kick Off",
  "topic": "Python for AI",
  "description": "...",
  "date": "23 April 2026",
  "time": "6:00 PM – 9:00 PM",
  "duration": "3 hours",
  "week": 1,
  "speaker": "Simon Plummer",
  "tags": ["Python", "Kickoff"],
  "whatYouWillLearn": ["..."],
  "buildIdeas": ["..."],
  "isKickoff": true
}
```

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users` | Admin / Moderator | List all users. Supports `?status=` and `?search=` query params |
| `GET` | `/api/users/[uid]` | Admin / Moderator or self | Get a user's profile |
| `PATCH` | `/api/users/[uid]` | Admin/Mod (privileged) or self (own fields) | Update a user |

**PATCH /api/users/[uid] — body for admin or moderator** (privileged fields — includes `role`, `userStatus`, `kickoffInPersonAdminConfirmed`, `accountDisabled`, `accountDisabledReason`, **`programOptOut`**, **`programOptOutAt`**):
```json
{
  "userStatus": "participated",
  "role": "moderator",
  "programOptOut": false,
  "programOptOutAt": null
}
```
Attendees **cannot** PATCH `programOptOut` / `programOptOutAt`; they use **`POST /api/me/leave-program`** to leave (see **Me** table below).

**PATCH /api/users/[uid] — body for self** (non-privileged fields only; `role` / `userStatus` return 403):
```json
{
  "displayName": "Jane Doe",
  "bio": "I love AI",
  "city": "London",
  "country": "United Kingdom",
  "skills": ["Python", "TensorFlow"],
  "experienceLevel": "intermediate"
}
```

---

### “Me” — profile and pending imports (Bearer required)

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/me/ensure-profile` | Create `users/{uid}` if missing; merge and delete `users/{email}` when present. Returns **`403`** + **`PROGRAM_OPT_OUT`** if the user document or pending row is programme-opted-out. |
| `POST` | `/api/me/leave-program` | **Bearer required.** Sets `programOptOut: true`, `programOptOutAt`, `keepUpdated: false` on `users/{uid}`. Caller must not already be blocked (same token checks as other routes). Client should sign out after success. |
| `GET` | `/api/me/attendance/check-in-status` | **Bearer required.** Query `?sessionId=`. Returns `{ eligible, active, opensAt, closesAt }` — **no code** exposed. |
| `POST` | `/api/me/attendance/self-check-in` | **Bearer required.** Body `{ sessionId, code }`. Validates window + code against `session_self_checkin`; sets `attendance/{uid}` and **`sessionAttendanceAudit`**. Idempotent if already marked. **`429`** if rate-limited. |
| `GET` | `/api/me/preregistered` | Returns pending `users/{email}` row for the signed-in user’s email (for registration UI). |
| `POST` | `/api/me/link-preregister` | Idempotently clean up after linking (removes email doc if still pending). |

Merge logic and field list: `src/lib/server/mergePendingUserIntoProfile.ts`.

---

### Admin — pre-registration and pending users (admin / moderator)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/preregistered` | List `users` with `preRegistered == true` (form imports / pending). |
| `POST` | `/api/admin/preregistered` | Batch upsert rows to `users/{email}` (CSV pipeline). |
| `POST` | `/api/admin/pending-user` | Create or update a **single** pending `users/{email}` from the admin “Add pending user” flow (`importSource: "admin"`, `createdByAdmin: true`). |

---

### Admin — maps, Bevy, tags, error logs, bulk actions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/users-location-map` | Admin / Moderator | Returns geocoded points for the users map (Nominatim; slow on first run for many unique places). |
| `GET` | `/api/admin/error-logs` | **Admin only** | Query `error_logs` (date range, search). |
| `POST` | `/api/admin/error-logs/test` | **Admin only** | Inserts a test document into `error_logs` (e.g. from `/admin/errors`). |
| `POST` | `/api/admin/tags` | Admin / Moderator | Seed or upsert tag categories. |
| `POST` | `/api/admin/bevy-merge` | Admin / Moderator | Reconcile Bevy export rows with `users`. |
| `POST` | `/api/admin/approve-all-users` | Admin / Moderator | Bulk-approve pending users (see handler for behaviour). |

---

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tags` | Public | Tag categories for forms (ordered list from Firestore `tags`). |
| `POST` | `/api/log-error` | Optional Bearer | Client error reports → `error_logs` via Admin SDK; user attached when token present. |
| `POST` | `/api/email/send` | Admin / Moderator | Bulk email (SMTP; used from `/admin/email`). |

---

### Attendance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/attendance` | Admin / Moderator | Get all users' attendance as a map |
| `GET` | `/api/attendance/[uid]` | Admin / Moderator or self | Get one user's attendance record |
| `PATCH` | `/api/attendance/[uid]` | Admin / Moderator | Toggle a session's attendance and merge **`sessionAttendanceAudit`** (`source: "admin"`) |

**PATCH body:**
```json
{
  "sessionId": "session-1",
  "attended": true
}
```

The admin UI calls this route via `toggleAttendance` in `adminService.ts` (not raw client `setDoc` on session keys) so audit fields stay consistent.

**GET /api/attendance response:**
```json
{
  "ok": true,
  "data": {
    "userId-abc": { "session-1": true, "session-2": false },
    "userId-xyz": { "session-1": true }
  }
}
```

---

### Assignments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/assignments` | Auth required | Admins/mods see all; attendees see own only |
| `POST` | `/api/assignments` | Auth required | Submit a new assignment |
| `GET` | `/api/assignments/[id]` | Admin/Mod or owner | Get a single assignment |
| `PATCH` | `/api/assignments/[id]` | Admin / Moderator | Update status, feedback, or grade |

**POST body:**
```json
{
  "weekNumber": 1,
  "sessionId": "session-1",
  "title": "My First Python Script",
  "description": "I built a number guessing game...",
  "githubUrl": "https://github.com/...",
  "notebookUrl": "https://colab.research.google.com/...",
  "demoUrl": ""
}
```

**PATCH body:**
```json
{
  "status": "approved",
  "feedback": "Great work! Clean code and good comments.",
  "grade": "A"
}
```

Valid statuses: `submitted` → `reviewed` → `approved`

---

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/projects` | Auth required | Admins/mods see all; attendees see own only |
| `POST` | `/api/projects` | Auth required | Submit a final project |
| `GET` | `/api/projects/[id]` | Admin/Mod or owner | Get a single project |
| `PATCH` | `/api/projects/[id]` | Admin / Moderator | Update status or feedback |

**POST body:**
```json
{
  "title": "AI Recipe Recommender",
  "description": "Uses Gemini API to suggest recipes...",
  "techStack": ["Python", "Flask", "Gemini API"],
  "githubUrl": "https://github.com/...",
  "demoUrl": "https://myapp.vercel.app",
  "weekCompleted": 4
}
```

**PATCH body:**
```json
{
  "status": "shortlisted",
  "feedback": "Impressive use of the Gemini API!"
}
```

Valid statuses: `submitted` → `reviewed` → `shortlisted` → `winner`; admins may also set `passed` (e.g. programme completion without a competition win).

---

## File structure (high level)

```
src/
├── lib/
│   ├── firebase-admin.ts     ← Admin SDK init (server-only)
│   ├── api-helpers.ts        ← verifyAuth, requireAdmin, ok/err helpers
│   └── server/               ← Nominatim, merge pending user, user admin view, app error log, …
└── app/
    └── api/
        ├── sessions/          ← GET (list), POST, GET/PUT/DELETE by id
        ├── users/             ← GET (list), GET/PATCH by uid
        ├── me/                ← ensure-profile, leave-program, attendance/*, preregistered, link-preregister
        ├── attendance/
        ├── assignments/
        ├── projects/
        ├── email/send/
        ├── log-error/
        ├── tags/
        └── admin/             ← preregistered, pending-user, users-location-map, error-logs, …
```

For the full list of route files, see `src/app/api/**/route.ts` in the repo.

---

## Error codes

| HTTP Status | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request — missing or invalid fields |
| `401` | Missing or invalid Authorization token |
| `403` | Forbidden — insufficient role |
| `404` | Resource not found |
| `429` | Too many requests (e.g. self check-in code attempts) |
| `500` | Server error — check server logs |

---

## How auth verification works

```
Client sends request with Authorization: Bearer <idToken>
  └─ api-helpers.verifyAuth()
        └─ adminAuth().verifyIdToken(token)   ← Firebase Admin SDK
              ├─ Valid token → decode uid, email
              │     └─ Read users/{uid} from Firestore
              │           ├─ accountDisabled → 403 ACCOUNT_DISABLED
              │           ├─ programOptOut → 403 PROGRAM_OPT_OUT
              │           └─ Else return { uid, email, role }
              └─ Invalid / expired → 401 Unauthorized
```
(Also checks `users/{normalisedEmail}` when the token includes an email, for the same flags on pending-id docs.)

The Firebase Admin SDK uses your service account private key to verify tokens **without a network round-trip** (the public keys are cached locally). This is fast and doesn't count toward Firebase usage quotas.

---

For production URL, CORS, and admin UX (user selection, email), see [08-site-deployment-and-admin.md](./08-site-deployment-and-admin.md).

---

← Back to [README.md](./README.md)
