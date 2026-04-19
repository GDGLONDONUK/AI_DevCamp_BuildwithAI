/**
 * adminService — all admin-only Firestore mutations in one place.
 * UI components call these functions; no raw Firestore calls in admin page.tsx.
 */
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, orderBy, query, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Assignment, PreRegisteredUser, Project, UserProfile, UserStatus } from "@/types";

// ── Users ─────────────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("displayName")));
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function setUserStatus(uid: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status, userStatus: status });
}

export async function setUserRole(uid: string, role: UserProfile["role"]): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

/** Admin bulk-edit profile fields (Firestore rules: admin may update user docs). */
export async function updateUserFields(uid: string, data: Record<string, unknown>): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) payload[k] = v;
  }
  await updateDoc(doc(db, "users", uid), payload);
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
  await updateDoc(doc(db, "projects", id), { status });
}

// ── Pre-registered users ───────────────────────────────────────────────────────

export async function fetchPreRegisteredUsers(): Promise<PreRegisteredUser[]> {
  const snap = await getDocs(collection(db, "preRegistered"));
  return snap.docs.map((d) => d.data() as PreRegisteredUser);
}

/** Bulk-upsert pre-registered users. Doc ID = normalised email. */
export async function upsertPreRegisteredUsers(
  users: PreRegisteredUser[]
): Promise<void> {
  const BATCH_SIZE = 499;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = users.slice(i, i + BATCH_SIZE);
    for (const u of chunk) {
      const id = u.email.toLowerCase().trim();
      batch.set(doc(db, "preRegistered", id), u, { merge: true });
    }
    await batch.commit();
  }
}

export async function getPreRegisteredByEmail(
  email: string
): Promise<PreRegisteredUser | null> {
  const snap = await getDoc(doc(db, "preRegistered", email.toLowerCase().trim()));
  return snap.exists() ? (snap.data() as PreRegisteredUser) : null;
}

export async function markPreRegisteredLinked(
  email: string,
  uid: string
): Promise<void> {
  await setDoc(
    doc(db, "preRegistered", email.toLowerCase().trim()),
    { linkedUid: uid, linkedAt: new Date().toISOString() },
    { merge: true }
  );
}
