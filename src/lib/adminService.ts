/**
 * adminService — all admin-only Firestore mutations in one place.
 * UI components call these functions; no raw Firestore calls in admin page.tsx.
 */
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, orderBy, query, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { stripUndefinedForFirestoreClient } from "@/lib/stripUndefinedFirestore";
import { Assignment, AppErrorLog, Project, UserMapPayload, UserProfile, UserStatus } from "@/types";
import type { BevyCsvRow, BevyMergePlan } from "@/lib/admin/bevyMerge";

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("displayName")));
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile;
    const id = d.id;
    const isEmailKey = id.includes("@");
    const signedIn =
      data.signedIn === false
        ? false
        : data.signedIn === true
          ? true
          : !isEmailKey;
    const uid =
      typeof data.uid === "string" && data.uid.length > 0
        ? data.uid
        : isEmailKey
          ? ""
          : id;
    return {
      ...data,
      email: (data.email && data.email) || (isEmailKey ? id : ""),
      uid,
      signedIn,
      registered: data.registered !== undefined ? data.registered : signedIn,
      firestoreId: id,
    } as UserProfile;
  });
}

export async function setUserStatus(userDocId: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(db, "users", userDocId), { status, userStatus: status });
}

export async function setUserRole(userDocId: string, role: UserProfile["role"]): Promise<void> {
  await updateDoc(doc(db, "users", userDocId), { role });
}

/** Admin bulk-edit profile fields (Firestore rules: admin may update user docs). */
export async function updateUserFields(userDocId: string, data: Record<string, unknown>): Promise<void> {
  const payload: Record<string, unknown> = {
    ...stripUndefinedForFirestoreClient(data),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, "users", userDocId), payload);
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function fetchAttendanceForUsers(
  uids: string[]
): Promise<Record<string, Record<string, boolean>>> {
  const result: Record<string, Record<string, boolean>> = {};
  await Promise.all(
    uids.map(async (uid) => {
      const snap = await getDoc(doc(db, "attendance", uid));
      result[uid] = snap.exists() ? (snap.data() as Record<string, boolean>) : {};
    })
  );
  return result;
}

export async function toggleAttendance(
  userId: string,
  sessionId: string,
  current: boolean
): Promise<boolean> {
  const next = !current;
  await setDoc(doc(db, "attendance", userId), { [sessionId]: next }, { merge: true });
  return next;
}

/** Admin: set a boolean on `attendance/{userId}` (e.g. in-person check-in, not a `session-*` id). */
export async function setAttendanceField(
  userId: string,
  field: string,
  value: boolean
): Promise<void> {
  await setDoc(doc(db, "attendance", userId), { [field]: value }, { merge: true });
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function fetchAllAssignments(): Promise<Assignment[]> {
  const snap = await getDocs(
    query(collection(db, "assignments"), orderBy("submittedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function setAssignmentStatus(
  id: string,
  status: Assignment["status"]
): Promise<void> {
  await updateDoc(doc(db, "assignments", id), { status });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchAllProjects(): Promise<Project[]> {
  const snap = await getDocs(
    query(collection(db, "projects"), orderBy("submittedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
}

export async function setProjectStatus(
  id: string,
  status: Project["status"]
): Promise<void> {
  await updateDoc(doc(db, "projects", id), { status, updatedAt: serverTimestamp() });
}

/** Update project status and/or admin feedback in one write. */
export async function updateProjectFields(
  id: string,
  data: { status?: Project["status"]; feedback?: string }
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.status !== undefined) payload.status = data.status;
  if (data.feedback !== undefined) payload.feedback = data.feedback;
  await updateDoc(doc(db, "projects", id), payload);
}

// ── Form registration (imported + pending sign-up) in `users` only ───────────

export async function fetchFormRegisteredUsers(): Promise<UserProfile[]> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/preregistered", {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!res.ok) throw new Error("fetchFormRegisteredUsers failed");
  const json = await res.json();
  if (!json?.ok) throw new Error(String(json?.error || "not ok"));
  return (json.data as UserProfile[]) ?? [];
}

/** Bulk upsert — writes `users/{email}` pending rows. */
export async function upsertRegistrationUsers(users: Record<string, unknown>[]): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/preregistered", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ users }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(String(b.error ?? res.status));
  }
}

export type BevyMergeResponse = {
  plan: Pick<
    BevyMergePlan,
    "inAppNotInBevy" | "inBevyNotInApp" | "nameMismatches" | "stats"
  >;
  written: { updated: number; created: number };
};

/** Apply Bevy export reconciliation (see /admin/bevy). */
/** One-shot: set every `pending` (or missing) `userStatus` to `participated`. */
export async function approveAllPendingUsersFromServer(): Promise<{
  updated: number;
  message?: string;
}> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/approve-all-users", {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(json.error ?? res.status));
  }
  if (!json?.ok) {
    throw new Error(String(json.error ?? "not ok"));
  }
  return json.data as { updated: number; message?: string };
}

export async function applyBevyMerge(bevyRows: BevyCsvRow[]): Promise<BevyMergeResponse> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/admin/bevy-merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ bevyRows }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(json.error ?? res.status));
  }
  if (!json?.ok) {
    throw new Error(String(json.error ?? "not ok"));
  }
  return json.data as BevyMergeResponse;
}

/** Geocoded user locations for the admin map (Nominatim; may be slow on first load). */
export async function fetchUsersLocationMap(): Promise<UserMapPayload> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/admin/users-location-map", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(json.error ?? res.status));
  }
  if (!json?.ok) {
    throw new Error(String(json.error ?? "not ok"));
  }
  return json.data as UserMapPayload;
}

export type ErrorLogsResponse = { logs: AppErrorLog[]; scanned: number; returned: number };

export async function fetchErrorLogsFromServer(options: {
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}): Promise<ErrorLogsResponse> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const p = new URLSearchParams();
  if (options.from) p.set("from", options.from);
  if (options.to) p.set("to", options.to);
  if (options.q) p.set("q", options.q);
  if (options.limit) p.set("limit", String(options.limit));
  const res = await fetch(`/api/admin/error-logs?${p.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(json.error ?? res.status));
  }
  if (!json?.ok) {
    throw new Error(String(json.error ?? "not ok"));
  }
  return json.data as ErrorLogsResponse;
}

/** Write one `error_logs` row (verifies collection + admin credentials). */
export async function postTestErrorLogEntry(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/admin/error-logs/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(json.error ?? res.status));
  }
  if (!json?.ok) {
    throw new Error(String(json.error ?? "not ok"));
  }
  return String((json.data as { id?: string })?.id ?? "");
}
