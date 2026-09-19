---
name: cohorts
description: >-
  Multi-cohort programme ops for AI DevCamp (September 2026 active). Use when
  opening a cohort, seeding sessions/speakers, registration open/close, joining
  cohorts, admin cohort filters, past-cohorts API, or editing sessions with
  cohortId. Triggers on: "cohort", "september", "registration open", "join
  cohort", "past cohorts", "seed sessions", "new programme", "active cohort".
---

# Cohorts — common tasks & do's / don'ts

## Current model (shipped)

**Not** the full nested redesign in `docs/12-multi-cohort-design.md`. Live app uses:

| Collection | How cohort is expressed |
|------------|-------------------------|
| `cohorts/{cohortId}` | Metadata only (Admin SDK / `/api/cohorts` — **no client Firestore access**) |
| `sessions/{id}` | Flat docs with **`cohortId`** field |
| `speakers/{id}` | Global roster (shared) |
| `users/{uid}` | **`cohortIds[]`**, **`activeCohortId`**, **`cohortParticipation`** |

IDs today:

- Spring (completed): `cohort-june-2026`
- Active (registration): `cohort-september-2026`

Helpers: `src/lib/cohorts.ts` (`getActiveCohortId()`, `sessionsForCohort()`, `userInCohort()`).

Env:

```bash
NEXT_PUBLIC_ACTIVE_COHORT_ID=cohort-september-2026
NEXT_PUBLIC_REGISTRATION_OPEN=true   # or false to close
```

---

## Common tasks

### Open / refresh September 2026 (or re-seed agenda)

```bash
npm run open-september-2026-cohort   # cohorts + sessions + speakers + tag spring users
npm run sync-firestore-programme    # upsert SPEAKERS + SESSIONS from src/data/*
npm run upload-speaker-photos       # public/speakers/* → Storage + Firestore photo URLs
```

Then set Vercel + `.env.local` registration/active cohort env vars. Deploy **`firestore.rules`** if cohort user fields changed.

### Add a speaker

1. Photo → `public/speakers/{id}.jpg` (or `.png`)
2. Entry in `src/data/speakers.ts` (`id`, `name`, `title`, `photo`, `linkedinUrl`, `sortOrder`, `roles`)
3. Reference `speakerIds` on sessions in `src/data/sessions.ts`
4. `npm run sync-firestore-programme` then `npm run upload-speaker-photos`

### Add / edit sessions for a cohort

1. Edit `src/data/sessions.ts` — **new IDs** for a new cohort (never reuse spring `session-1` for September)
2. Set **`cohortId`** on every session
3. `npm run sync-firestore-programme`
4. Attendee UI uses `useSessions()` → **active cohort only**; admin can filter by cohort

### Open / close registration

- `NEXT_PUBLIC_REGISTRATION_OPEN=true|false` (default **closed** if unset)
- New profiles: `ensureUserProfileDocument` + `/register` assign **active** cohort
- Existing spring alumni: **not** auto-enrolled — `JoinCohortBanner` → `POST /api/me/join-cohort`

### Admin: list users / attendance for one cohort

Admin Users toolbar → **Cohort** select (`September 2026` / `Spring 2026` / `All`). Attendance columns use filtered `cohortSessions`.

### Past cohorts page 500s?

`/api/cohorts` and `/api/cohorts/[id]` **must** use `adminDb()` from `@/lib/firebase-admin`. Never bare `initializeApp()` without service-account env (breaks on Vercel).

---

## Do's

- **Do** tag every session with `cohortId`
- **Do** use `adminDb()` in any `/api/cohorts*` route
- **Do** set cohort membership via register / `ensure-profile` / `join-cohort` / admin PATCH (privileged)
- **Do** keep spring sessions and attendance intact when opening a new cohort (new session IDs)
- **Do** upload speaker photos to Storage (local `/speakers/*` paths break on production if Firestore still points at them)
- **Do** deploy `firestore.rules` after changing `touchesServerMaintainedUserFields` (includes `cohortIds`, `activeCohortId`, `cohortParticipation`)

## Don'ts

- **Don't** auto-enrol previous-cohort users into the new cohort
- **Don't** overwrite spring `session-*` docs with September content
- **Don't** let clients self-update `cohortIds` / `activeCohortId` / `cohortParticipation` (rules + API)
- **Don't** implement full `cohortSessions/` nesting unless migrating the whole app — prefer `sessions.cohortId`
- **Don't** put `CERTIFIER_API_TOKEN` or Admin keys in `NEXT_PUBLIC_*`
- **Don't** assume `/past-cohorts` reads Firestore from the browser — it uses `/api/cohorts` only

---

## Key files

| File | Role |
|------|------|
| `src/lib/cohorts.ts` | IDs + helpers |
| `src/data/sessions.ts` | Spring + September agendas |
| `src/data/speakers.ts` | Roster |
| `src/hooks/useSessions.ts` | Active-cohort sessions for attendee UI |
| `src/app/api/me/join-cohort/route.ts` | Self-serve join active cohort |
| `src/app/api/cohorts/route.ts` | List cohorts (Admin SDK) |
| `scripts/open-september-2026-cohort.ts` | Seed/migrate script |
| `docs/11-cohort-architecture.md` | Architecture notes (read the “shipped” banner) |
