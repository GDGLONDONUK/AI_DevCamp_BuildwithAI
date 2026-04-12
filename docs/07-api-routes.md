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

---

## Endpoints

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

**PATCH body — admin/moderator** (can set privileged fields):
```json
{
  "userStatus": "participated",
  "role": "moderator"
}
```

**PATCH body — self** (non-privileged fields only; attempting `role`/`userStatus` returns 403):
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

### Attendance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/attendance` | Admin / Moderator | Get all users' attendance as a map |
| `GET` | `/api/attendance/[uid]` | Admin / Moderator or self | Get one user's attendance record |
| `PATCH` | `/api/attendance/[uid]` | Admin / Moderator | Toggle a session's attendance |

**PATCH body:**
```json
{
  "sessionId": "session-1",
  "attended": true
}
```

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

Valid statuses: `submitted` → `reviewed` → `shortlisted` → `winner`

---

## File structure

```
src/
├── lib/
│   ├── firebase-admin.ts     ← Admin SDK init (server-only)
│   └── api-helpers.ts        ← verifyAuth, requireAdmin, ok/err helpers
└── app/
    └── api/
        ├── sessions/
        │   ├── route.ts      ← GET (list), POST (create)
        │   └── [id]/route.ts ← GET, PUT, DELETE
        ├── users/
        │   ├── route.ts      ← GET (list, admin only)
        │   └── [uid]/route.ts← GET, PATCH
        ├── attendance/
        │   ├── route.ts      ← GET all (admin only)
        │   └── [uid]/route.ts← GET, PATCH
        ├── assignments/
        │   ├── route.ts      ← GET (list), POST (submit)
        │   └── [id]/route.ts ← GET, PATCH
        └── projects/
            ├── route.ts      ← GET (list), POST (submit)
            └── [id]/route.ts ← GET, PATCH
```

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
| `500` | Server error — check server logs |

---

## How auth verification works

```
Client sends request with Authorization: Bearer <idToken>
  └─ api-helpers.verifyAuth()
        └─ adminAuth().verifyIdToken(token)   ← Firebase Admin SDK
              ├─ Valid token → decode uid, email
              │     └─ Read users/{uid} from Firestore → get role
              │           └─ Return { uid, email, role }
              └─ Invalid / expired → 401 Unauthorized
```

The Firebase Admin SDK uses your service account private key to verify tokens **without a network round-trip** (the public keys are cached locally). This is fast and doesn't count toward Firebase usage quotas.

---

← Back to [README.md](./README.md)
