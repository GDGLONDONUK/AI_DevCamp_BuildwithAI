# 04 · Authentication & Security

## How authentication works

We use **Firebase Authentication** for identity. It handles:

- Email/password signup and login
- Google OAuth ("Sign in with Google")
- Issuing and refreshing short-lived **ID tokens** (JWT)
- Persisting the session in the browser (IndexedDB)

### Sign-in flow

```
User clicks "Sign In"
  └─ AuthModal opens
       ├─ Email/password → signInWithEmailAndPassword()
       └─ Google button  → signInWithPopup(googleProvider)
            │
            ▼
       Firebase Auth issues an ID token
            │
            ▼
       onAuthStateChanged fires in AuthContext
            │
            ▼
       getUserProfile() reads the user doc from Firestore
            │
            ▼
       userProfile state populated → UI updates
```

### Google sign-in on production (e.g. Vercel)

`signInWithPopup` only works on **authorized domains** listed in Firebase Console → **Authentication** → **Settings** → **Authorized domains**. Add each deployment host (such as `your-project.vercel.app`) without `https://`. If you skip this, users see `auth/unauthorized-domain` and Google sign-in fails. Also set all `NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_SITE_URL` on the host (e.g. Vercel env vars). See [06-getting-started.md](./06-getting-started.md) (Deploying to Vercel).

### Registration flow

```
/register page (4 steps)
  Step 1: Name, handle, email, password
  Step 2: Location, experience level, bio, links, photo
  Step 3: Skills, expertise, want-to-learn, can-offer
  Step 4: Optional first project

  On submit:
    1. createUserWithEmailAndPassword() → Firebase Auth user created
    2. uploadBytes() → avatar saved to Storage (if provided)
    3. setDoc(users/{uid}) → user doc written to Firestore
       { role: "attendee", userStatus: "pending", ... }
    4. Redirect to /dashboard
```

---

## Four layers of security

Security is enforced at four levels. Each adds a layer of defence.

### Layer 1: Next.js Proxy (`src/proxy.ts`)

> **Next.js 16 change:** the file was previously called `middleware.ts` with a `middleware()` export. In Next.js 16 it was renamed to `proxy.ts` with a `proxy()` export. The behaviour is identical.

Runs at the Edge (before the page loads). Does three things on every request:

#### 1a — CORS (Cross-Origin Resource Sharing)

Prevents malicious websites from making cross-origin requests to this application. The proxy inspects the `Origin` header of every incoming request:

```
Incoming request
  └─ Has an Origin header? (cross-origin fetch / XHR)
        ├─ Origin is in ALLOWED_ORIGINS list?
        │     ├─ OPTIONS preflight → 204 + CORS headers
        │     └─ Normal request   → allow + set Access-Control-Allow-Origin
        └─ Origin NOT in list → 403 Forbidden
```

Page navigations from a user's browser tab do **not** send an `Origin` header, so they are never blocked by CORS. Only programmatic cross-origin requests (JavaScript `fetch`, `XMLHttpRequest`) are subject to the check.

**Allowed origins** are configured in `src/proxy.ts` and via the environment variable:

```bash
# .env.local — also set this in Vercel environment variables
NEXT_PUBLIC_SITE_URL=https://yourapp.com
```

The hardcoded list also includes the Firebase Hosting domains and `localhost:3000` for local development.

#### 1b — Route protection

Checks for a `firebase-session` cookie (set by `AuthContext` when the user signs in):

- If the cookie is missing → redirects to `/`
- Protects: `/dashboard`, `/submit`, `/profile`, `/admin`

**Important:** This is a UX shortcut, not a true security boundary. A motivated user could bypass it. The real enforcement is Layer 4.

#### 1c — Security response headers

Applied to **every** response, regardless of route or origin:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking via iframes |
| `X-Content-Type-Options` | `nosniff` | Stop MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |

### Layer 2: Client-side guards (in page components)


Every protected page checks `userProfile?.role` inside a `useEffect`:

```tsx
useEffect(() => {
  if (!loading && (!user || userProfile?.role !== "admin")) {
    router.push("/");
  }
}, [user, userProfile, loading]);
```

This redirects immediately if the wrong user tries to access a page.

### Layer 4: Firestore Security Rules (`firestore.rules`)

**This is the real security boundary.** Rules run inside Firebase's servers. No client code can bypass them — even if someone uses the Firebase SDK directly from the browser console.

#### How rules are structured

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions (defined once, reused everywhere)
    function isSignedIn() { ... }
    function isOwner(uid) { ... }
    function isAdmin() { ... }
    function isAdminOrMod() { ... }
    function touchesPrivilegedFields() { ... }

    match /users/{userId} { ... }
    match /sessions/{sessionId} { ... }
    match /attendance/{userId} { ... }
    match /assignments/{assignmentId} { ... }
    match /projects/{projectId} { ... }
  }
}
```

#### Key rules explained

**Prevent role escalation:**
```
// Users CAN update their own doc, UNLESS they try to change role or userStatus
allow update: if isSignedIn() && (
  (isOwner(userId) && !touchesPrivilegedFields()) ||
  isAdminOrMod()
);
```
Without this, a user could call `updateDoc(users/myId, { role: "admin" })` and promote themselves.

**Immutable userId on submissions:**
```
// When a user updates their own assignment, userId must stay the same
allow update: if
  resource.data.userId == request.auth.uid &&
  request.resource.data.userId == resource.data.userId &&
  !...affectedKeys().hasAny(['status', 'userId'])
```
Without this, a user could change which user "owns" a submission.

**Sessions are public-read, admin-write:**
```
match /sessions/{sessionId} {
  allow read: if true;             // Anyone can see the schedule
  allow write: if isAdminOrMod(); // Only admins/mods can create/edit
}
```

---

## Firebase Storage rules (`storage.rules`)

Avatar images live in `storage/avatars/{uid}/`. Rules:

- Anyone can **read** (avatars are public)
- Only the **owner** can **write** their own avatar
- Max file size: **5 MB**
- Only **image/* MIME types** accepted

```
match /avatars/{userId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth.uid == userId
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches('image/.*');
}
```

---

## Roles explained

| Role | Can do |
|------|--------|
| `attendee` | Read own profile, submit assignments/projects, view sessions |
| `moderator` | Everything above + manage attendance, sessions, update statuses |
| `admin` | Everything above + change roles, delete documents |

**How to make someone an admin:** In the Firebase Console → Firestore → `users` collection → find the user's document → change `role` to `"admin"`. (The UI cannot do this because of the security rules — intentionally.)

---

## Auth context (`src/contexts/AuthContext.tsx`)

The app wraps everything in an `AuthProvider`. Inside any component, you can call:

```tsx
const { user, userProfile, loading, refreshProfile } = useAuth();
```

| Value | Type | Meaning |
|-------|------|---------|
| `user` | `User \| null` | Firebase Auth user (has `uid`, `email`, etc.) |
| `userProfile` | `UserProfile \| null` | The Firestore doc for this user |
| `loading` | `boolean` | `true` while Firebase is checking the session |
| `refreshProfile` | `() => Promise<void>` | Re-fetches `userProfile` from Firestore |

**Always check `loading` first.** While `loading` is `true`, both `user` and `userProfile` may be `null` even for logged-in users.

```tsx
if (loading) return <Spinner />;
if (!user) return <LoginPrompt />;
```

---

Next → [05-key-concepts.md](./05-key-concepts.md)
