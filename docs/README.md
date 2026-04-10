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

Start with [01-project-overview.md](./01-project-overview.md) →
