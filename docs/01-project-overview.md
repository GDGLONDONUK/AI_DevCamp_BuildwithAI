# 01 · Project Overview

## What is this?

**AI DevCamp 2026 — Build with AI** is a learning platform for a 3-week in-person programme held in London. It lets organisers manage sessions and attendees, while participants can:

- Register and build a profile
- Browse the session schedule and curriculum
- Submit weekly assignments and a final project
- Track their own progress on a dashboard

Admins use a dedicated panel to take attendance, approve users, review submissions, and manage sessions end-to-end.

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 16** (App Router) | Server-side rendering, file-based routing, edge middleware |
| Language | **TypeScript** | Type safety, better tooling and auto-complete |
| Styling | **Tailwind CSS v4** | Utility-first, no CSS files to manage |
| Auth | **Firebase Authentication** | Email/password + Google OAuth out of the box |
| Database | **Cloud Firestore** | Real-time NoSQL, scales automatically |
| Storage | **Firebase Storage** | User avatar uploads |
| Icons | **Lucide React** | Lightweight, consistent icon set |
| Toast notifications | **react-hot-toast** | Non-blocking feedback messages |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────┐
│              Browser (React)                │
│                                             │
│  Next.js App Router pages                  │
│    /             Landing page              │
│    /register     Multi-step signup         │
│    /sessions     Session schedule          │
│    /curriculum   Learning roadmap          │
│    /dashboard    User progress             │
│    /submit       Assignment & project      │
│    /profile      Edit profile              │
│    /admin        Admin panel               │
│                                             │
│  Shared state: AuthContext (React Context) │
│  Data layer:   lib/ service files          │
│  Custom hooks: hooks/                      │
└──────────────────┬──────────────────────────┘
                   │ Firebase JS SDK (client)
┌──────────────────▼──────────────────────────┐
│               Firebase                      │
│  Authentication  ─  users log in/out       │
│  Firestore       ─  all app data           │
│  Storage         ─  avatar images          │
│  Security Rules  ─  server-side access     │
└─────────────────────────────────────────────┘
```

---

## Key design decisions

### 1. Client-side Firebase (no backend server)
All data access goes through the Firebase JavaScript SDK directly from the browser. There is no custom API server. Security is enforced by **Firestore Security Rules** — these run inside Firebase and cannot be bypassed.

### 2. App Router (not Pages Router)
Next.js 16 uses the App Router. Every folder inside `src/app/` is a route. A `page.tsx` file inside a folder makes that URL public.

### 3. Role-based access
Every user has a `role` (`attendee` | `moderator` | `admin`) and a `userStatus` (`pending` | `participated` | `certified` | `not-certified` | `failed`). These control what they can see and do. Only admins can change these fields — enforced at the database level.

### 4. Static data → Firestore migration
Session data started as a hardcoded TypeScript array (`src/data/sessions.ts`). Admins can now seed that data into Firestore and edit sessions live. The app always reads from Firestore.

---

## Environment variables

All secrets live in `.env.local` (never committed to git). The prefix `NEXT_PUBLIC_` means the variable is included in the browser bundle — appropriate for Firebase's client config, which is designed to be public.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

> ⚠️ Never put private service account keys or admin SDK credentials in `NEXT_PUBLIC_` variables — those would be visible to everyone.

---

Next → [02-project-structure.md](./02-project-structure.md)
