# AI DevCamp 2026 — Build with AI

> **GDG London · 4-Week Beginner AI Learning Programme**

A web platform for the AI DevCamp programme. Attendees register, browse sessions, submit weekly assignments, and showcase final projects. Organisers manage everything through a built-in admin panel.

---

## Features

- **Firebase Auth** — Email/password & Google sign-in
- **Multi-step registration** — Profile, skills, expertise, location
- **Session schedule** — Live data from Firestore, managed by admins
- **Curriculum** — 4-week beginner AI learning roadmap
- **Assignment & project submission** — Weekly work tracked per user
- **User dashboard** — Personal progress overview
- **Admin panel** — Attendance grid (per-session filters, Kick Off join mode), user management (including programme de-registration), status updates, session CRUD, users map (by location), CSV export with kick-off in-person fields
- **Programme lifecycle** — Attendees can leave the programme (no app access until staff restore them); cohort email respects communications eligibility
- **Session attendance** — Schedule and dashboard show an **Attended** label when marked; optional **live 6-digit self check-in** during a host-configured window (`session_self_checkin` + `/api/me/attendance/*`)
- **Favicons** — `npm run generate-favicons` builds square icons from `public/logo.png`; see docs
- **Error logging (Firestore)** — Client, React, and API failures are written to **`error_logs`** via the Admin SDK (never from the browser client). The collection **only appears in the Firebase console after the first document exists**; use **Test log** on **`/admin/errors`** to create one, or [open Firestore Data](https://console.firebase.google.com/project/buildwithai-gdglondon/firestore/databases/-default-/data) and look for the `error_logs` collection. Admins can search and filter in **`/admin/errors`**.

## Tech stack

| | |
|--|--|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage |

## Quick start

```bash
npm install
# Create .env.local with your Firebase config (see docs/06-getting-started.md)
npm run dev
```

## Documentation

Full developer docs are in the [`docs/`](./docs/README.md) folder:

- [Project Overview](./docs/01-project-overview.md)
- [Project Structure](./docs/02-project-structure.md) — includes `src/lib/admin/`, `src/features/admin/`, and `/admin` sub-routes
- [Database Schema](./docs/03-database-schema.md)
- [Auth & Security](./docs/04-auth-and-security.md)
- [Key Concepts](./docs/05-key-concepts.md) — layers, services, and where admin helpers belong
- [Getting Started](./docs/06-getting-started.md)
- [API Routes](./docs/07-api-routes.md)
- [Site, deployment & admin](./docs/08-site-deployment-and-admin.md) — production URL, env vars, Discord, bulk email, users map, attendee CSV (in-person columns), pending users

## Firebase project

Project ID: `buildwithai-gdglondon`  
Console: [console.firebase.google.com/project/buildwithai-gdglondon](https://console.firebase.google.com/project/buildwithai-gdglondon)
