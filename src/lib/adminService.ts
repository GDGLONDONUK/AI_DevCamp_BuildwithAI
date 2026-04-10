/**
 * adminService — all admin-only Firestore mutations in one place.
 * UI components call these functions; no raw Firestore calls in admin page.tsx.
 */
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Assignment, Project, UserProfile, UserStatus } from "@/types";

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
