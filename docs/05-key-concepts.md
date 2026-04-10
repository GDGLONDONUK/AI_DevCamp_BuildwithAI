# 05 · Key Concepts

This page explains the patterns used throughout the codebase so you know what to look for and why things are written the way they are.

---

## 1. React Context — global shared state

**Problem:** Many components need to know "who is logged in". Passing this as a prop through every component would be messy.

**Solution:** `AuthContext` holds the auth state at the top of the app and any component can access it with `useAuth()`.

```tsx
// src/contexts/AuthContext.tsx — creates the context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // ... listens to Firebase auth changes ...
  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// src/app/layout.tsx — wraps the whole app
<AuthProvider>
  <Navbar />
  {children}
</AuthProvider>

// Any component anywhere in the tree
const { user, userProfile } = useAuth();
```

---

## 2. Custom hooks — reusable data fetching

**Problem:** The same data-fetching code (load sessions from Firestore, handle loading/error) was copy-pasted into multiple pages.

**Solution:** Extract it into a custom hook in `src/hooks/`.

```ts
// src/hooks/useSessions.ts
export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  return { sessions, loading };
}

// Usage in any page:
const { sessions, loading } = useSessions();
```

**Rule of thumb:** If you find yourself writing the same `useState` + `useEffect` + fetch pattern in two places, make a hook.

---

## 3. Service layer — no Firestore in components

**Problem:** Firestore query code mixed into page components makes pages hard to read and impossible to test.

**Solution:** All database calls live in `src/lib/` service files. Pages only call these functions.

```
Page component   →   lib/adminService.ts   →   Firestore
(what to show)       (how to fetch/save)        (the data)
```

```ts
// ❌ Don't do this in a page component
const snap = await getDocs(query(collection(db, "users"), orderBy("displayName")));
const users = snap.docs.map(d => d.data());

// ✅ Do this instead
import { fetchAllUsers } from "@/lib/adminService";
const users = await fetchAllUsers();
```

Service files:

| File | Responsibility |
|------|---------------|
| `lib/auth.ts` | Register, login, logout, create user document |
| `lib/adminService.ts` | Admin reads/writes (users, attendance, assignments, projects) |
| `lib/sessionService.ts` | Session CRUD + seeding from static data |

---

## 4. TypeScript types — shared contracts

**Problem:** If a Firestore document has 20 fields, every file that touches it needs to know what those fields are.

**Solution:** A single `src/types/index.ts` file defines every data shape. Import from there everywhere.

```ts
// src/types/index.ts
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  userStatus: UserStatus;
  // ...
}

// Any file that deals with users
import { UserProfile } from "@/types";
const profile: UserProfile = await getUserProfile(uid);
```

When you add a new field to Firestore documents, **add it to the type first**. TypeScript will then show you every place that needs updating.

---

## 5. Separation of concerns

The project is split into layers. Each layer has one job:

```
┌─────────────────────────────────┐
│  Pages  (src/app/)              │  Route = URL. Compose components.
│  What the user sees.            │  Minimal logic.
├─────────────────────────────────┤
│  Components  (src/components/)  │  Reusable UI pieces.
│  How things look.               │  Receive props, emit events.
├─────────────────────────────────┤
│  Hooks  (src/hooks/)            │  Data fetching + local state.
│  When to load data.             │  Return data to components.
├─────────────────────────────────┤
│  Services  (src/lib/)           │  Talk to Firebase.
│  How to get/save data.          │  Pure async functions.
├─────────────────────────────────┤
│  Types  (src/types/)            │  TypeScript interfaces.
│  What the data looks like.      │  Shared by all layers.
└─────────────────────────────────┘
```

---

## 6. `"use client"` vs server components

Next.js App Router makes every file a **Server Component** by default (renders on the server, zero JavaScript sent to the browser). But Firebase Auth and React state only work in the browser.

**When to add `"use client"` at the top of a file:**

- The component uses `useState`, `useEffect`, `useContext`
- The component uses Firebase (auth, firestore, storage)
- The component handles browser events (`onClick`, `onChange`, etc.)

Every page in this project starts with `"use client"` because they all interact with Firebase.

---

## 7. Firestore real-time vs one-time reads

Firestore supports two read modes:

| Mode | Function | When to use |
|------|----------|-------------|
| One-time fetch | `getDocs()` / `getDoc()` | Load data once when page opens |
| Real-time listener | `onSnapshot()` | Live updates (e.g. chat, live dashboard) |

This project uses **one-time reads** everywhere. The admin page has a "Refresh" button to reload manually. This keeps things simple and predictable.

---

## 8. `Promise.all` — parallel async calls

When you need multiple pieces of data and they don't depend on each other, fetch them simultaneously:

```ts
// ❌ Slow — waits for each one to finish before starting the next
const users = await fetchAllUsers();       // 300ms
const sessions = await getSessions();      // 200ms
// Total: 500ms

// ✅ Fast — all start at the same time
const [users, sessions] = await Promise.all([
  fetchAllUsers(),   // \
  getSessions(),     //  } all start together
]);
// Total: ~300ms (the slowest one)
```

---

## 9. Toast notifications

`react-hot-toast` provides non-blocking feedback messages. Call it anywhere:

```ts
import toast from "react-hot-toast";

toast.success("Profile saved!");
toast.error("Something went wrong");
toast("Session already exists", { icon: "ℹ️" });
```

The `<Toaster />` component in `layout.tsx` renders the actual toasts.

---

## 10. Component patterns you'll see often

### Conditional rendering
```tsx
{user && <Dashboard />}           // only render if user exists
{loading ? <Spinner /> : <Data />} // loading state
{error && <ErrorMessage />}        // error state
```

### Tailwind class merging with `cn()`
```tsx
import { cn } from "@/lib/utils";

<button className={cn(
  "px-4 py-2 rounded",         // base classes
  isActive && "bg-green-500",  // conditional
  className                    // allow overriding from parent
)} />
```

### State update pattern (immutable)
```tsx
// Update one user in a list without mutating the array
setUsers(prev => prev.map(u =>
  u.uid === targetUid ? { ...u, role: "admin" } : u
));
```

---

Next → [06-getting-started.md](./06-getting-started.md)
