# AI DevCamp 2026 — Build with AI · Developer Docs

Welcome! This folder contains everything you need to understand and contribute to the project as a junior developer.

## Documents in this folder

| File | What it covers |
|------|----------------|
| [01-project-overview.md](./01-project-overview.md) | What the app does, tech stack, key decisions |
| [02-project-structure.md](./02-project-structure.md) | Every folder and file explained |
| [03-database-schema.md](./03-database-schema.md) | Firestore collections, fields, and rules |
| [04-auth-and-security.md](./04-auth-and-security.md) | How authentication and access control work |
| [05-key-concepts.md](./05-key-concepts.md) | React patterns, hooks, context, services |
| [06-getting-started.md](./06-getting-started.md) | How to run the project locally |
| [07-api-routes.md](./07-api-routes.md) | REST API reference — endpoints, auth, request/response shapes |
| [08-site-deployment-and-admin.md](./08-site-deployment-and-admin.md) | Production URL, env vars, Discord, admin features, `me` & pending-user APIs |

## Quick orientation

```
User visits site
  └─ Browses sessions & curriculum (public); schedule data from Firestore
  └─ Registers → users/{uid} or pending users/{email} until first login merge
  └─ Admin sets userStatus → participated / certified / …
  └─ Approved user: full session content, recordings, resources
  └─ Optional: live self check-in on /sessions (code + window set in Session Editor)
  └─ Assignments & projects submitted; admin reviews in /admin
  └─ Programme leave → programOptOut (no app until admin restores)
```

**Full feature table and architecture diagram:** [01 · Project overview](./01-project-overview.md).

## Recent changes (for returning contributors)

Use this as a changelog-style index; details live in the linked docs.

| Topic | Summary |
|-------|---------|
| **Architecture & features** | [01-project-overview.md](./01-project-overview.md) — product feature table, layered diagram (React ↔ Next API ↔ Firebase), design decisions. |
| **Self check-in** | `session_self_checkin/{sessionId}` (code + window); **`POST /api/me/attendance/self-check-in`**, **`GET /api/me/attendance/check-in-status`**; UI on **`/sessions`** (`SessionSelfCheckInPanel`); admin: **Session Editor → Live attendance code**. Attendance **`sessionAttendanceAudit`** for traceability. [03](./03-database-schema.md), [07](./07-api-routes.md), [08](./08-site-deployment-and-admin.md). |
| **Attendance audit** | `attendance/{uid}.sessionAttendanceAudit` — `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `source` (`admin` \| `self_check_in`). Admin toggles use **`PATCH /api/attendance/[uid]`** via `adminService.toggleAttendance`. |
| **Programme de-registration** | **`POST /api/me/leave-program`**, **`programOptOut`** privileged; **`verifyAuth`** → `PROGRAM_OPT_OUT`. [04](./04-auth-and-security.md), [07](./07-api-routes.md). |
| **Communications** | `receivesProgramCommunications()`; bulk email respects opt-out. `src/lib/programCommunications.ts`. |
| **Admin attendance** | Session filter; Kick Off **`kickoffJoinedAs`**. |
| **Attendee session UI** | Green highlight + **Attended** label on **`/sessions`** and **dashboard**. |
| **Favicons** | **`npm run generate-favicons`** (sharp) → `public/favicon-*.png`, `apple-touch-icon.png`; **`layout.tsx` `metadata.icons`**. [08](./08-site-deployment-and-admin.md). |
| **Production** | `https://aidevcamp.gdg.london`; **`NEXT_PUBLIC_SITE_URL`**, **`NEXT_PUBLIC_APP_URL`**, Firebase authorized domains. [08](./08-site-deployment-and-admin.md). |
| **Auth & profile** | Password reset, `OpenLoginFromQuery`, **`ensure-profile`**, pending user merge, `authProviders` sync. [04](./04-auth-and-security.md). |
| **Project layout** | [02-project-structure.md](./02-project-structure.md) — `src/app/api/me/attendance/*`, `attendanceAudit.ts`, `sessionSelfCheckInConstants.ts`, scripts. |
| **Session gating** | Rich content for **`participated`** / **`certified`** (see sessions page). |
| **Multi-speaker sessions** | `sessions.speakers[]` + legacy `speaker` / `speakerTitle` / `speakerPhoto`; `getSessionSpeakersList` in `src/lib/sessionSpeakers.ts`; Session Editor + `/sessions` schedule. [03](./03-database-schema.md), [02](./02-project-structure.md). |
| **Shared UI / logging** | `SocialBrandIcons.tsx`; `src/lib/admin/*` domain helpers; `src/lib/logging/*` for safer client logs. [02](./02-project-structure.md). |

Start with [01-project-overview.md](./01-project-overview.md) →
