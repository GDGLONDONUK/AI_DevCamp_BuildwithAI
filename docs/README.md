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

- **`src/proxy.ts`** — renamed from `middleware.ts` (Next.js 16 convention). Export is now `proxy()`, not `middleware()`.
- **`UserProfile` type** — extended with `city`, `country`, `handle`, `roleTitle`, `websiteUrl`, `skills`, `expertise`, `wantToLearn`, `canOffer`, `keepUpdated` fields.
- **Session content gating** — session recordings, resources, and build ideas are only visible to users with `userStatus: "participated"` or `"certified"`.
- **Session registration removed** — users no longer register for individual sessions; access is granted by an admin setting `userStatus`.
- **`src/data/tags.ts`** — centralised skill/expertise tag presets (used by register and profile pages).
- **`src/lib/adminService.ts`** — all admin Firestore mutations are here (previously inline in the page).
- **`src/hooks/useSessions.ts` / `useAdminData.ts`** — custom hooks for data fetching.

Start with [01-project-overview.md](./01-project-overview.md) →
