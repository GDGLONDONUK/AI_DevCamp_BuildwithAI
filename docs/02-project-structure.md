# 02 · Project Structure

```
AI_DevCamp_BuildwithAI/
│
├── docs/                         ← You are here
│
├── public/                       ← Static assets served as-is
│
├── src/
│   ├── app/                      ← Next.js App Router (one folder = one URL)
│   │   ├── layout.tsx            ← Root layout: fonts, AuthProvider, Navbar, Toasts
│   │   ├── globals.css           ← Global styles, Tailwind, animations
│   │   ├── page.tsx              ← / Landing page
│   │   ├── register/page.tsx     ← /register  Multi-step signup flow
│   │   ├── sessions/page.tsx     ← /sessions  Session schedule (public)
│   │   ├── curriculum/page.tsx   ← /curriculum Learning roadmap (static)
│   │   ├── dashboard/page.tsx    ← /dashboard User progress (auth required)
│   │   ├── submit/page.tsx       ← /submit    Submit assignment or project
│   │   ├── profile/page.tsx      ← /profile   Edit your profile
│   │   ├── admin/
│   │   │   ├── page.tsx          ← /admin     Main admin panel (tabs: attendance, users, …)
│   │   │   ├── email/page.tsx    ← /admin/email  Bulk email to attendees / selections
│   │   │   └── import/page.tsx   ← /admin/import CSV import tools
│   │   └── api/                  ← REST API (server-side, Firebase Admin SDK)
│   │       ├── sessions/         ← GET list, POST create, GET/PUT/DELETE by id
│   │       ├── users/            ← GET list (admin), GET/PATCH by uid
│   │       ├── attendance/       ← GET all, GET/PATCH by uid
│   │       ├── assignments/      ← GET list, POST submit, GET/PATCH by id
│   │       └── projects/         ← GET list, POST submit, GET/PATCH by id
│   │
│   ├── components/               ← Reusable UI pieces
│   │   ├── Navbar.tsx            ← Top navigation bar
│   │   ├── AuthModal.tsx         ← Sign-in modal (email + Google)
│   │   ├── admin/
│   │   │   ├── SessionEditor.tsx ← Create/edit session modal form
│   │   │   ├── UserEditor.tsx    ← Admin edit user fields modal
│   │   │   └── StatusDropdown.tsx← User status picker dropdown
│   │   └── ui/
│   │       ├── Button.tsx        ← Reusable button component
│   │       ├── Input.tsx         ← Labeled input with error state
│   │       ├── LocationPicker.tsx← City + country selector
│   │       ├── SkillsSelector.tsx← Tag chip selector (skills, expertise…)
│   │       └── CountryFlag.tsx   ← Renders a flag image from flagcdn.com
│   │
│   ├── features/                 ← Feature-scoped UI + types (domain “slices”)
│   │   └── admin/
│   │       ├── types.ts          ← Admin tab / filter types (e.g. tab ids)
│   │       └── components/       ← Admin-only components used by app routes
│   │           └── PreRegisteredDetailModal.tsx  ← Pre-registered row detail drawer
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       ← Global auth state (user + profile)
│   │
│   ├── hooks/                    ← Custom React hooks (data fetching)
│   │   ├── useSessions.ts        ← Load sessions from Firestore
│   │   └── useAdminData.ts       ← Load all admin data in one call
│   │
│   ├── lib/                      ← Pure service/utility functions (no JSX)
│   │   ├── firebase.ts           ← Firebase client SDK initialisation
│   │   ├── firebase-admin.ts     ← Firebase Admin SDK (server-side API routes only)
│   │   ├── api-helpers.ts        ← verifyAuth, requireAdmin, ok/err response helpers
│   │   ├── auth.ts               ← Auth helpers (register, login, logout)
│   │   ├── adminService.ts       ← Admin Firestore mutations (used by admin UI)
│   │   ├── admin/                ← Admin-only helpers (CSV, exports, shared formatting)
│   │   │   ├── format.ts         ← formatAdminDateTime (tables + CSV)
│   │   │   ├── csvPreRegistered.ts ← parseCSVText, buildPreRegisteredUsersFromRows
│   │   │   ├── exportAttendeesCsv.ts ← Download attendees as CSV
│   │   │   └── uploadPreRegisteredCsv.ts ← POST pre-registered CSV to API + toast
│   │   ├── sessionService.ts     ← Session CRUD + seeding
│   │   ├── flags.ts              ← Country → flag image URL
│   │   └── utils.ts              ← cn() Tailwind class merger
│   │
│   ├── data/                     ← Static seed data (TypeScript constants)
│   │   ├── sessions.ts           ← Default 6 sessions (source of truth for seeding)
│   │   └── tags.ts               ← Skill/expertise tag presets
│   │
│   ├── types/
│   │   └── index.ts              ← All TypeScript interfaces and types
│   │
│   └── proxy.ts                 ← Edge proxy (UX route protection, Next.js 16)
│
├── firestore.rules               ← Firestore security rules (deployed to Firebase)
├── storage.rules                 ← Storage security rules (deployed to Firebase)
├── firestore.indexes.json        ← Composite indexes for efficient queries
├── firebase.json                 ← Firebase CLI config (points to rules files)
├── .firebaserc                   ← Firebase project alias
├── next.config.ts                ← Next.js config (image domains, etc.)
├── .env.local                    ← Local secrets — NEVER commit this file
└── .gitignore                    ← .env* is ignored
```

---

## Where to find things

| Task | File |
|------|------|
| Change a page's layout or content | `src/app/<route>/page.tsx` |
| Add a new reusable component | `src/components/ui/` |
| Change how login/logout works | `src/lib/auth.ts` |
| Change what data admins can modify | `src/lib/adminService.ts` |
| Admin CSV export, pre-reg upload, date formatting | `src/lib/admin/*.ts` |
| Add admin-only UI tied to `/admin` | `src/features/admin/components/` |
| Change session CRUD logic | `src/lib/sessionService.ts` |
| Add a new TypeScript type | `src/types/index.ts` |
| Change who can access what in the DB | `firestore.rules` |
| Add/remove skill tag presets | `src/data/tags.ts` |
| Change session seed data | `src/data/sessions.ts` |
| Add an environment variable | `.env.local` |
| Change route protection logic | `src/proxy.ts` |

---

## Naming conventions

| Pattern | Used for |
|---------|----------|
| `PascalCase.tsx` | React components |
| `camelCase.ts` | Utility files, hooks, services |
| `kebab-case/` | Next.js route folders |
| `UPPER_CASE` | Constants (e.g. `SESSIONS`, `SKILL_TAGS`) |

---

Next → [03-database-schema.md](./03-database-schema.md)
