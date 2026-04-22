# 06 · Getting Started (Local Development)

## Prerequisites

- **Node.js** 18 or later — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node)
- **Firebase CLI** — `npm install -g firebase-tools`
- A code editor — VS Code recommended

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd AI_DevCamp_BuildwithAI
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Set up environment variables

Create a file called `.env.local` in the project root (copy from `.env.example` if it exists):

```bash
# Site URL — used by the CORS allowlist in src/proxy.ts (no trailing slash)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Public app URL — password reset continue link + admin email templates (no trailing slash)
# In production, set to your real domain, e.g. https://aidevcamp.gdg.london
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase config — get values from Firebase Console → Project Settings → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> When deploying to Vercel, set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to your **canonical production URL** (e.g. `https://aidevcamp.gdg.london` — no trailing slash) in **Settings → Environment Variables**. `NEXT_PUBLIC_SITE_URL` is required for CORS on `/api/*` from the browser; `NEXT_PUBLIC_APP_URL` is used for Firebase **password reset** links and for merge fields in **admin email** (`/admin/email`).

> ⚠️ Never commit `.env.local` to git. It's already in `.gitignore`.

---

## 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The dev server has hot-reload — saving a file updates the browser instantly.

---

## 5. Deploying to Vercel (production checklist)

If **Google sign-in** or auth works locally but fails on `*.vercel.app` or a custom domain, check all of the following.

### Environment variables on Vercel

In [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**, set the same `NEXT_PUBLIC_*` values as in `.env.local` (Production + Preview as needed):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (usually `your-project-id.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_SITE_URL` — your **live origin** (e.g. `https://aidevcamp.gdg.london` or your `*.vercel.app` host) — **no trailing slash**. Used by `src/proxy.ts` for CORS so `fetch("/api/...")` calls (including **Send email** in admin) are allowed from the browser.
- `NEXT_PUBLIC_APP_URL` — same host as the public app (e.g. `https://aidevcamp.gdg.london`) for **password reset** and **admin email** content.

On Vercel, the platform also sets **`VERCEL_URL`** (hostname only). The proxy adds `https://${VERCEL_URL}` automatically for the default Vercel hostname. **Custom domains** (e.g. `aidevcamp.gdg.london`) do **not** match `VERCEL_URL` — you must set `NEXT_PUBLIC_SITE_URL` to that custom URL or browser `fetch` to `/api/*` from that origin will be blocked.

Redeploy after changing variables.

### Firebase: authorized domains (required for Google sign-in)

Firebase only allows OAuth on hosts you explicitly list.

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Settings** → **Authorized domains**.
2. Click **Add domain** and add:
   - Your Vercel hostname, e.g. `ai-dev-camp-buildwith-ai.vercel.app` (no `https://`).
   - Your custom domain later, if you add one in Vercel.
3. `localhost` and your `firebaseapp.com` / `web.app` hosts are usually already listed.

If this step is skipped, sign-in often fails with `auth/unauthorized-domain` (the app can show a toast explaining this after a deploy).

### Google Cloud OAuth (if you use a custom OAuth client)

If you configured a **Web client ID** in Google Cloud Console, add **Authorized JavaScript origins** and **Authorized redirect URIs** for your production URLs. For most Firebase-only setups, Firebase manages this when Google is enabled under Authentication → Sign-in method.

---

## 6. Make yourself an admin

1. Register an account on the app (you'll be `role: attendee, userStatus: pending`)
2. Go to [Firebase Console](https://console.firebase.google.com) → Firestore Database → `users` collection
3. Find your document (it will have your email in it)
4. Click the `role` field and change it to `"admin"`
5. Refresh the app — you'll see the Admin link in the navbar

---

## 7. Seed the session data

Once you're an admin:

1. Go to `/admin` → **Sessions** tab
2. Click **"Import Default Sessions"**
3. All 6 sessions from `src/data/sessions.ts` will be written to Firestore

To update sessions with new content after changing `src/data/sessions.ts`:
- Click **"Re-seed All"** (overwrites all sessions)

---

## 8. Firebase CLI commands

```bash
# Login to Firebase
firebase login

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage

# Deploy everything
firebase deploy
```

---

## 9. Project scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Run production build locally
npm run lint     # Run ESLint
```

---

## 10. Common tasks for a junior developer

### Add a new field to user profiles

1. Add the field to `src/types/index.ts` → `UserProfile` interface
2. Add the field to the form in `src/app/profile/page.tsx`
3. Make sure `updateDoc` in the profile save handler includes the new field
4. If the field should be set at registration, update `src/app/register/page.tsx` too

### Add a new page

1. Create a folder: `src/app/my-new-page/`
2. Create `src/app/my-new-page/page.tsx`
3. Start with this template:

```tsx
"use client";

export default function MyNewPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white">My New Page</h1>
      </div>
    </div>
  );
}
```

4. Add a link in `src/components/Navbar.tsx` if needed

### Add a new Firestore collection

1. Add a TypeScript interface in `src/types/index.ts`
2. Create a service file in `src/lib/myThingService.ts` with your CRUD functions
3. Add rules for the new collection in `firestore.rules`
4. Deploy the rules: `firebase deploy --only firestore:rules`

### Fix a Firestore query error "index required"

When Firestore asks you to create an index:
1. Click the link in the error message — it takes you straight to the Firebase Console
2. Click "Create Index"
3. Once created, also add it to `firestore.indexes.json` so it's tracked in the repo

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing or insufficient permissions" in console | Your Firestore rules are blocking the query — check `firestore.rules` |
| "The query requires an index" | Create the index via the link in the error |
| App shows spinner forever | Check `.env.local` — Firebase config is probably wrong |
| "Firebase: Error (auth/...)" | Check the Firebase Console → Authentication → Sign-in methods are enabled |
| Google sign-in works locally but not on Vercel | Add your Vercel hostname under **Authentication → Settings → Authorized domains**. Set `NEXT_PUBLIC_*` and `NEXT_PUBLIC_SITE_URL` on Vercel and redeploy. |
| `Origin not allowed` when calling APIs (e.g. send email) | `src/proxy.ts` CORS list must include your site origin exactly (`https://…`, no trailing slash). Set `NEXT_PUBLIC_SITE_URL` on Vercel; redeploy. Vercel’s `VERCEL_URL` is also allowed automatically. |
| Changes not showing after save | Hard-refresh the browser (`Ctrl+Shift+R`) |
| `npm run build` fails | Run `npm run lint` first to find TypeScript/ESLint errors |
| `"middleware" file convention is deprecated` warning | Rename `middleware.ts` → `proxy.ts` and the export `middleware` → `proxy` (Next.js 16) |
| Stale TypeScript build errors after fixing code | Delete the `.next/` folder and run `npm run build` again |

---

## Project Firebase configuration

| Setting | Value |
|---------|-------|
| Project ID | `buildwithai-gdglondon` |
| Firebase Console | [console.firebase.google.com/project/buildwithai-gdglondon](https://console.firebase.google.com/project/buildwithai-gdglondon) |
| Firestore location | (check console) |
| Auth providers | Email/Password, Google |

---

← Back to [README.md](./README.md)
