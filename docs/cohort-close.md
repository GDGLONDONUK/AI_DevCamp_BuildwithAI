# Closing a cohort (April 2027 and later)

Registration stays **open**. Closing a programme does not set `NEXT_PUBLIC_REGISTRATION_OPEN=false`. New sign-ups join the enrolment cohort (the current `upcoming` / `live` cohort that is not `closed`).

## What “closed” means

On `cohorts/{id}`: `status: "closed"`, `closedAt`, `closedBy`, `isCurrent: false`.

While a cohort is closed:

- Self check-in, lab/assignment submit, project submit, and audience voting are rejected **in the API**.
- Admins can still edit attendance and statuses (each write keeps an audit entry).
- Members keep read access to recordings, materials, and their own submissions.

## Certification rule

Implemented in `src/lib/certification.ts` (single source of truth):

- Counted sessions: not cancelled and not `isClosing`.
- Required: `ceil(certificationThreshold * counted)` (default `0.6` → 5 of 8 in September 2026).
- Qualifiers get `users/{uid}.cohortParticipation[cohortId].status = "certified"` plus `certifiedAt`, `certificationRule`, `certificateShareId`.
- Closing-day attendance is stamped `true` with `source: "admin"` and `reason: "cohort-close-auto"`.
- Global `userStatus` is still set for old screens; certificate pages **must not** use it.

Do **not** issue Credsverse credentials as part of close. That is a separate admin action.

## Runbook — close April 2027 (or the next live cohort)

1. Confirm counted sessions in Firestore (`isClosing` on the hackathon/closing day; cancelled sessions tagged `cancelled`).
2. Optionally set `cohorts/{id}.certificationThreshold` (default `0.6`).
3. Open `/admin/cohorts` (or MCP `admin_preview_close_cohort`) and review:
   - who qualifies
   - who is one session short
4. Confirm **Close cohort**. The write is idempotent.
5. Create the **next** placeholder cohort if it does not exist (`status: "upcoming"`, `isCurrent: true`). Close currently ensures `cohort-april-2027` when September is closed; for a later close, add the next id the same way.
6. Seed winners (if there is a hackathon) with `npx tsx --env-file=.env.local scripts/seed-hackathon-winners.ts`.
7. **Issue certificates** only when you mean to spend Certifier quota: `/admin/cohorts` dry-run, then `POST /api/admin/certifier/issue-cohort` with `{ "dryRun": false }` (batches, per-cohort `skipIfExists`, `CERTIFIER_GROUP_ID_SEPT_2026` for September).

## New registrations after close

- Server enrolment: `resolveEnrolmentCohortId()` (Firestore lifecycle, not `NEXT_PUBLIC_ACTIVE_COHORT_ID`).
- Existing members keep `activeCohortId` on the closed cohort so their dashboard, certificate, and project still resolve.
- Public winners: `/hackathon/devcamp-september-2026/winners`. Graduates: `/cohorts/september-2026/certified`.
