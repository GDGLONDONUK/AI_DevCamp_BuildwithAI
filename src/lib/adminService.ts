/**
 * adminService — all admin-only Firestore mutations in one place.
 * UI components call these functions; no raw Firestore calls in admin page.tsx.
 */
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, orderBy, query, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Assignment, Project, UserProfile, UserStatus } from "@/types";

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
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v;
  }
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
