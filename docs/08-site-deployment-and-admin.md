# 08 · Site, deployment & admin features

This document describes the **production site**, **environment variables** beyond the basics, and **admin / auth behaviours** added for GDG London operations.

---

## Production URL

| | |
|--|--|
| **Canonical site** | [https://aidevcamp.gdg.london](https://aidevcamp.gdg.london) (Vercel + custom domain) |

Configure DNS in your domain provider per Vercel’s instructions, then set environment variables and Firebase **authorized domains** for that hostname (see [06-getting-started.md](./06-getting-started.md)).

---

## Environment variables (production)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | **Required for CORS** in `src/proxy.ts`. Must be the **exact** browser origin, **no trailing slash**, e.g. `https://aidevcamp.gdg.london`. API calls from the browser (e.g. **Send email** in admin) are rejected if this does not match. |
| `NEXT_PUBLIC_APP_URL` | **Password reset** action link (`src/lib/auth.ts`) and **admin email** templates / merge fields (`src/app/admin/email/page.tsx`). Should match the public site, e.g. `https://aidevcamp.gdg.london`. |
| `NEXT_PUBLIC_FIREBASE_*` | Same as local — Firebase web app config. |
| `FIREBASE_ADMIN_*` | Server-only — Admin SDK for API routes. |

Vercel also sets `VERCEL_URL` (the default `*.vercel.app` host). The proxy includes `https://${VERCEL_URL}` for previews, but **`NEXT_PUBLIC_SITE_URL` must be your custom domain** when users browse `aidevcamp.gdg.london`.

---

## Community (Discord)

The [home page](/) (`src/app/page.tsx`) links to the **GDG London Discord** invite: [https://discord.gg/asrXvYeA](https://discord.gg/asrXvYeA) (hero CTA and footer). Update the constant `DISCORD_INVITE_URL` in that file if the invite changes.

---

## Authentication: password reset

- **Forgot password** is available in `AuthModal` (email/password sign-in) and via [`/?login=1&reset=1`](https://aidevcamp.gdg.london/?login=1&reset=1) (used from the register page).
- **Implementation:** `sendPasswordResetEmail` in `src/lib/auth.ts` with `NEXT_PUBLIC_APP_URL` (or `window.location.origin`) for the continue URL.
- **Errors:** `src/lib/firebaseAuthErrors.ts` maps common Firebase auth codes for user-facing toasts.

---

## Authentication: open login from the URL

`src/components/OpenLoginFromQuery.tsx` (wrapped in **`<Suspense>`** on the home page) reads the query string:

| Query | Effect |
|-------|--------|
| `login=1` | Opens the sign-in modal. |
| `reset=1` (with `login=1`) | Opens the modal in **forgot password** mode. |

After handling, the component strips `login` and `reset` from the URL with `history.replaceState` so the address bar stays clean.

---

## User profiles, pending imports & first sign-in

- **Auth-backed profile** lives at `users/{uid}` (Firebase Auth UID as document id).
- **Before someone has signed up**, a row may exist at `users/{email}` (document id = normalised email) with `signedIn: false` and import / pre-registration data — see [03-database-schema.md](./03-database-schema.md#pending-user-rows-usersemail).
- **`POST /api/me/ensure-profile`** (Bearer ID token) creates `users/{uid}` when missing, **merges** a pending `users/{email}` if found, and **deletes** the email document. Used from `AuthContext` after sign-in.
- **Merge fields** are applied in `src/lib/server/mergePendingUserIntoProfile.ts` (form fields, profile text, `authProviders` from the Auth record, etc.).
- **`authProviders`:** array of Firebase provider IDs (e.g. `google.com`, `password`) — written on first ensure-profile and **synced** on each sign-in via `syncAuthProvidersToUserDoc` in `src/lib/auth.ts` (called from `AuthContext`).

**Admin-added pending users:** `POST /api/admin/pending-user` creates/updates a pending `users/{email}` row (`importSource: "admin"`, `createdByAdmin: true`). Same merge path on first login.

---

## Admin panel (high level)

| Area | Features |
|------|----------|
| **Header** | **Add pending user** (opens modal) — same as pre-reg flow. |
| **Users** | **Grid (cards)** and **table** view; **checkboxes** per user (with email); **select all**; bulk bar **Send email to N selected** (opens `/admin/email?source=selection` with `sessionStorage` recipients). |
| **Pre-Registered** | Table with checkboxes, CSV upload, **Add person**, filters, detail modal. |
| **User list** | Badges for **Google** / **email** sign-in from `authProviders` (or legacy `registrationSource`). |

**Roles:** `requireAdmin` in API routes allows **admin** and **moderator** unless a route is admin-only (check each handler).

---

## Related docs

- [04-auth-and-security.md](./04-auth-and-security.md) — proxy, CORS, layers
- [06-getting-started.md](./06-getting-started.md) — local run, Vercel checklist, Firebase authorized domains
- [07-api-routes.md](./07-api-routes.md) — `/api/me/*` and admin routes
- [03-database-schema.md](./03-database-schema.md) — `users` fields and pending rows

---

← Back to [README.md](./README.md)
