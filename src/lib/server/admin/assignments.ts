/**
 * Admin assignment list/get/update. Call only after requireAdmin (or owner for get).
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { AdminOpError } from "@/lib/server/admin/errors";
import { serializeDoc } from "@/lib/server/admin/serialize";

export async function listAssignments(opts?: {
  userId?: string;
  sessionId?: string;
  status?: string;
  limit?: number;
}) {
  const cap = Math.min(Math.max(opts?.limit ?? 500, 1), 1000);
  let query: FirebaseFirestore.Query = adminDb().collection("assignments");
  if (opts?.userId) query = query.where("userId", "==", opts.userId);
  else if (opts?.sessionId) query = query.where("sessionId", "==", opts.sessionId);
  else if (opts?.status) query = query.where("status", "==", opts.status);
  const snap = await query.limit(cap).get();
  let assignments = snap.docs.map((d) => serializeDoc(d.id, d.data()));
  if (opts?.userId && opts.sessionId) {
    assignments = assignments.filter((a) => a.sessionId === opts.sessionId);
  }
  if (opts?.status && (opts.userId || opts.sessionId)) {
    assignments = assignments.filter((a) => a.status === opts.status);
  }
  return {
    count: assignments.length,
    kind: "weekly_labs",
    note: "These are session assignments, not hackathon finals. Finals are projects/.",
    assignments,
  };
}

export async function getAssignment(id: string) {
  const snap = await adminDb().collection("assignments").doc(id).get();
  if (!snap.exists) throw new AdminOpError(`Assignment not found: ${id}`, 404);
  return serializeDoc(snap.id, snap.data()!);
}

export async function updateAssignment(
  id: string,
  fields: { status?: string; feedback?: string; grade?: string }
) {
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.feedback !== undefined) update.feedback = fields.feedback;
  if (fields.grade !== undefined) update.grade = fields.grade;
  if (Object.keys(update).length <= 1) {
    throw new AdminOpError("Provide status, feedback, and/or grade", 400);
  }
  const ref = adminDb().collection("assignments").doc(id);
  if (!(await ref.get()).exists) throw new AdminOpError(`Assignment not found: ${id}`, 404);
  await ref.update(update);
  const updated = await ref.get();
  return serializeDoc(updated.id, updated.data()!);
}
