import type { DocumentData } from "firebase-admin/firestore";

export function serializeDoc(id: string, data: DocumentData): Record<string, unknown> {
  return { id, ...data };
}

export function compactUser(id: string, data: DocumentData): Record<string, unknown> {
  return {
    id,
    uid: data.uid || id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    role: data.role ?? "attendee",
    userStatus: data.userStatus ?? "pending",
    cohortIds: Array.isArray(data.cohortIds) ? data.cohortIds : [],
    activeCohortId: data.activeCohortId ?? null,
    hackathonParticipant: data.hackathonParticipant === true,
  };
}
