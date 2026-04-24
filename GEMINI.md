# GEMINI.md — AI DevCamp 2026

Welcome to the **AI DevCamp 2026** codebase. This file provides instructional context for Gemini CLI interactions within this workspace.

## Project Overview
A comprehensive learning and management platform for the GDG London AI DevCamp programme. It facilitates participant registration, session scheduling, assignment/project submissions, and provides a robust admin panel for organisers.

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Primary Auth Flow:** Email/Password and Google OAuth with custom profile merging (`ensure-profile`).

## Building and Running
The project uses `npm` for package management and `tsx` for running scripts.

- **Install dependencies:** `npm install`
- **Development mode:** `npm run dev`
- **Production build:** `npm run build`
- **Start production server:** `npm run start`
- **Linting:** `npm run lint`
- **Generate favicons:** `npm run generate-favicons` (requires `public/logo.png`)
- **Backfill user profiles:** `npm run ensure-profiles -- user@example.com`

## Development Conventions

### Architecture
- **App Router:** All routes are located in `src/app`.
- **API Security:** Route handlers in `src/app/api` must use `verifyAuth()` or `requireAdmin()` from `@/lib/api-helpers.ts` to secure access using the Firebase Admin SDK.
- **Data Layers:** 
    - Use `src/lib/server/` for logic that requires the Firebase Admin SDK (secrets/privileged writes).
    - Use `src/lib/` for shared utilities and client-side services.
    - Components are split between `src/components/` (global) and `src/features/admin/components/` (scoped to admin functionality).

### Coding Standards
- **Naming:**
    - Components: PascalCase (e.g., `UserEditor.tsx`).
    - Files/Directories: kebab-case (e.g., `api-helpers.ts`, `users-map`).
- **Styling:** Strictly follow Tailwind CSS v4 utility classes. Prefer vanilla CSS gradients for complex UI elements (see `RootLayout` toast config).
- **TypeScript:** Use strict typing. Central types are in `src/types/index.ts`. Avoid `any`.
- **Error Handling:** Log significant client and server errors to the `error_logs` Firestore collection using `clientErrorLogger` or server-side logging helpers.

### Firebase Integration
- **Direct Client Access:** Only allowed for world-readable data (e.g., `sessions`) as defined in `firestore.rules`.
- **Privileged Access:** Must go through Next.js API routes using the Admin SDK.
- **Audit Logs:** All attendance changes must include a `sessionAttendanceAudit` map (managed via `PATCH /api/attendance/[uid]`).

## Key Files & Directories
- `docs/`: Comprehensive developer documentation (Architecture, Schema, API).
- `src/app/api/`: All server-side route handlers.
- `src/lib/api-helpers.ts`: Standardised API response and auth verification logic.
- `src/contexts/AuthContext.tsx`: Manages Firebase Auth state and the current user's Firestore profile.
- `firestore.rules`: Security boundaries for client-side SDK access.
- `scripts/`: Maintenance and utility scripts.

## TODO / Known Patterns
- **User Merging:** When an imported user (`users/{email}`) signs in for the first time, the `ensure-profile` API route handles merging their data into the permanent `users/{uid}` document.
- **Attendance:** Marking attendance updates a boolean for the session ID and appends metadata to the `sessionAttendanceAudit` map.
