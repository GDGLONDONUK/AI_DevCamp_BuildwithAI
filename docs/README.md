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
  └─ Can browse sessions & curriculum (public)
  └─ Registers (multi-step form → Firestore user doc, role: attendee, status: pending)
  └─ Admin approves → status: participated or certified
  └─ Approved user sees full session content, recordings, resources
  └─ User submits assignments & projects
  └─ Admin reviews via /admin panel
```

## Recent changes (for returning contributors)

- **Production** — See [08-site-deployment-and-admin.md](./08-site-deployment-and-admin.md): canonical URL `https://aidevcamp.gdg.london`, set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` on Vercel, add the hostname under Firebase **authorized domains**. Custom domains are **not** covered by `VERCEL_URL` in CORS.
- **Home page** — Discord invite (`DISCORD_INVITE_URL` in `src/app/page.tsx`) and `OpenLoginFromQuery` for `/?login=1` and `/?login=1&reset=1`.
- **Auth** — Password reset in `AuthModal`; `sendPasswordResetEmail` in `src/lib/auth.ts`; `authProviders` on `users` synced on sign-in; `syncAuthProvidersToUserDoc` / `userAuthShowsGoogle` for admin badges.
- **Users / imports** — Pending rows at `users/{email}`; `POST /api/me/ensure-profile` merges on first sign-in; `POST /api/admin/pending-user` for “Add pending user”. Merge helper: `src/lib/server/mergePendingUserIntoProfile.ts`. Schema: [03 · Database schema](./03-database-schema.md) (section *Pending user rows*).
- **Admin** — Users tab: checkboxes, grid + table, bulk **Send email**; header + Users + Pre-Registered **Add pending user**; pre-reg table unchanged. API additions: [07-api-routes.md](./07-api-routes.md).
- **`src/lib/admin/`** — Admin domain helpers: CSV for pre-registered imports, attendee export, `format.ts`, `uploadPreRegisteredCsv.ts`.
- **`src/features/admin/`** — e.g. `PreRegisteredDetailModal`.
- **`src/proxy.ts`** — Next.js 16 (formerly `middleware.ts`); CORS + route guards.
- **`UserProfile` type** — `authProviders`, `importSource`, `createdByAdmin`, and other import/pre-reg fields; see `src/types/index.ts`.
- **Session gating** — Recordings and resources for `userStatus: "participated"` or `"certified"`.
- **`src/data/tags.ts`**, **`src/lib/adminService.ts`**, **hooks** — as before.

Start with [01-project-overview.md](./01-project-overview.md) →
