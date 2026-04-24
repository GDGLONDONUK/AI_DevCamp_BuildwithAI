# 01 · Project Overview

## What is this?

**AI DevCamp 2026 — Build with AI** is a learning platform for a multi-week programme held in London. The public site is deployed at **[aidevcamp.gdg.london](https://aidevcamp.gdg.london)**; community chat is linked from the home page ([Discord](https://discord.gg/asrXvYeA)).

**Participants** register, complete a profile, browse the live session schedule, optionally **self check in** during a session with a time-limited code, submit assignments and a final project, and track progress on a dashboard.

**Organisers** use a built-in **admin panel** for attendance (grid + filters + Kick Off join mode + optional live codes), user and session management, bulk email, imports, error logs, and a users-by-location map.

---

## Features (product)

| Area | What the app provides |
|------|------------------------|
| **Auth** | Email/password and Google sign-in; password reset; deep links `/?login=1` and `/?login=1&reset=1`. |
| **Registration** | Multi-step signup; pending `users/{email}` merged on first sign-in via `POST /api/me/ensure-profile`. |
| **Sessions** | Schedule from Firestore; **one or more speakers** per session (`speakers[]` + legacy single-speaker fields); public browse; **recordings & rich content** gated to approved statuses (`participated`, `certified`). |
| **Attendance** | Admin grid + per-session filters; Kick Off **in-person vs online** note (`kickoffJoinedAs`); **live self check-in** (6-digit code + admin-defined time window) on `/sessions`; **Attended** badge on schedule + dashboard when marked. |
| **Assignments & projects** | Submit, review, statuses; gallery-style project visibility where configured. |
| **Dashboard** | Progress, programme communications opt-out / leave programme, session list with attendance labels. |
| **Programme lifecycle** | **Leave programme** sets `programOptOut` → no API/session until admin clears; cohort email uses `receivesProgramCommunications()`. |
| **Admin** | Users (grid/table, CSV export, bulk email, User Editor), Attendance, Sessions (CRUD, **multi-speaker** editor, **live check-in config**), Pre-registered, Assignments, Projects, sub-routes: email, import, Bevy, errors, users map. |
| **Observability** | Client/server errors to `error_logs`; `/admin/errors`. |
| **Branding** | Navbar uses `public/logo.png`; **favicons** are generated square PNGs from the logo (`npm run generate-favicons`) — see [08-site-deployment-and-admin.md](./08-site-deployment-and-admin.md). |

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 16** (App Router) | Server components & route handlers, file-based routing, `src/proxy.ts` edge behaviour |
| Language | **TypeScript** | Type safety across client and API |
| Styling | **Tailwind CSS v4** | Utility-first UI |
| Auth | **Firebase Authentication** | Email/password + Google OAuth |
| Database | **Cloud Firestore** | Real-time data, security rules |
| Storage | **Firebase Storage** | Avatars |
| Server APIs | **Firebase Admin SDK** (in `/api` routes) | Token verification, privileged writes, email, merges |
| Icons | **Lucide React** | Consistent icon set |
| Toasts | **react-hot-toast** | Lightweight feedback |
| Dev tooling | **sharp** (devDependency) | `scripts/generate-favicons.ts` — square favicons from logo |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React 19)                      │
│  src/app/**/page.tsx  — marketing, sessions, dashboard, …   │
│  src/components/**    — Navbar, AuthModal, SessionEditor, … │
│  AuthContext          — Firebase Auth + Firestore profile     │
│  Firebase JS SDK      — direct Firestore/Storage where rules allow │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────┐
│              Next.js 16 (Node / Edge)                      │
│  src/app/api/**       — REST handlers + Admin SDK           │
│    verifyAuth, requireAdmin, bulk email, ensure-profile,     │
│    attendance PATCH, self check-in, leave-program, …         │
│  src/proxy.ts         — CORS, UX cookie guard, headers       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      Firebase                               │
│  Authentication  — ID tokens for /api                     │
│  Firestore       — users, sessions, attendance, assignments,│
│                    projects, tags, error_logs,               │
│                    session_self_checkin (admin-read check-in)│
│  Storage         — avatars                                   │
│  Security rules  — client-side boundary; Admin SDK bypasses  │
└─────────────────────────────────────────────────────────────┘
```

**Data flow patterns**

1. **Client-first** — Most reads (sessions list, profile) use the Firebase web SDK; rules enforce access.
2. **Server-first** — Anything needing secrets, cross-document checks, or bypassing rules uses `/api/*` + Admin SDK (e.g. self check-in validates code and window server-side).
3. **Hybrid** — Admin attendance grid historically used client `setDoc`; **session toggles** now go through **`PATCH /api/attendance/[uid]`** so **`sessionAttendanceAudit`** stays consistent.

---

## Key design decisions

### 1. Firebase + Next.js API routes
Firestore rules are the main **client** boundary. **Route handlers** under `src/app/api` use the **Admin SDK** for: JWT verification, `users` privileged fields, `attendance` writes with audit metadata, `session_self_checkin` reads during self check-in, programme leave, bulk email, merges, and error logging.

### 2. Sensitive data not on public session documents
`sessions/*` is **world-readable**. Live check-in **codes** live in **`session_self_checkin/{sessionId}`** (admin/moderator read/write in rules; attendees never read the code from Firestore — they hear it in session and POST to `/api/me/attendance/self-check-in`).

### 3. App Router
Each `src/app/<segment>/page.tsx` maps to a URL. Layouts wrap shared UI (`Navbar`, `AuthProvider`, toasts).

### 4. Roles and status
`role`: `attendee` | `moderator` | `admin`. `userStatus`: `pending` | `participated` | `certified` | `not-certified` | `failed`. Content gating and self check-in eligibility depend on **status** (and **programOptOut** blocks all API access).

### 5. Session content source
Default seed data lives in `src/data/sessions.ts`; production schedule is **Firestore** (`sessionService`, admin Session Editor).

---

## Environment variables

Public (browser-safe):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_SITE_URL      ← CORS / origin (no trailing slash)
NEXT_PUBLIC_APP_URL       ← password reset & email templates
```

Server-only:

```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

> Never put service account keys in `NEXT_PUBLIC_*`.

---

Next → [02-project-structure.md](./02-project-structure.md)
