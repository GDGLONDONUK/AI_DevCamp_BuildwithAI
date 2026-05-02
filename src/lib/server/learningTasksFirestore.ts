import type { DocumentSnapshot } from "firebase-admin/firestore";

export function deriveSessionOrder(sessionKey: string, explicit?: number): number {
  if (explicit !== undefined && Number.isFinite(explicit)) return explicit;
  const m = /^session-(\d+)$/i.exec(sessionKey.trim());
  return m ? parseInt(m[1], 10) : 999;
}

export function firestoreTsToIso(v: unknown): string | undefined | null {
  if (v == null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeLearningTaskDoc(doc: DocumentSnapshot): Record<string, unknown> {
  const d = doc.data();
  if (!d) return { id: doc.id };
  return {
    id: doc.id,
    userId: d.userId,
    sessionKey: d.sessionKey,
    sessionLabel: d.sessionLabel,
    sessionOrder: d.sessionOrder,
    title: d.title,
    category: d.category,
    priority: d.priority,
    progress: d.progress,
    dueDate: firestoreTsToIso(d.dueDate),
    notes: d.notes ?? "",
    sourceTemplateId: d.sourceTemplateId ?? null,
    sortOrder: d.sortOrder,
    createdAt: firestoreTsToIso(d.createdAt) ?? undefined,
    updatedAt: firestoreTsToIso(d.updatedAt) ?? undefined,
    createdByUid: typeof d.createdByUid === "string" ? d.createdByUid : undefined,
    createdByLabel: typeof d.createdByLabel === "string" ? d.createdByLabel : undefined,
    updatedByUid: typeof d.updatedByUid === "string" ? d.updatedByUid : undefined,
    updatedByLabel: typeof d.updatedByLabel === "string" ? d.updatedByLabel : undefined,
  };
}

export function serializeLearningTemplateDoc(doc: DocumentSnapshot): Record<string, unknown> {
  const d = doc.data();
  if (!d) return { id: doc.id };
  return {
    id: doc.id,
    sessionKey: d.sessionKey,
    sessionLabel: d.sessionLabel,
    sessionOrder: d.sessionOrder,
    title: d.title,
    category: d.category,
    sortOrder: d.sortOrder,
    active: d.active !== false,
    createdAt: firestoreTsToIso(d.createdAt) ?? undefined,
    updatedAt: firestoreTsToIso(d.updatedAt) ?? undefined,
  };
}
