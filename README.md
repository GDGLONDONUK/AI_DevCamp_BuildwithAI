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
- **Admin panel** — Attendance grid, user management, status updates, session CRUD

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
- [Project Structure](./docs/02-project-structure.md)
- [Database Schema](./docs/03-database-schema.md)
- [Auth & Security](./docs/04-auth-and-security.md)
- [Key Concepts](./docs/05-key-concepts.md)
- [Getting Started](./docs/06-getting-started.md)

## Firebase project

Project ID: `buildwithai-gdglondon`  
Console: [console.firebase.google.com/project/buildwithai-gdglondon](https://console.firebase.google.com/project/buildwithai-gdglondon)
