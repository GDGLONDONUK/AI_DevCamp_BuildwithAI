import { auth } from "@/lib/firebase";
import type { LearningTask, LearningTaskTemplate } from "@/types";

async function getBearer(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  return token;
}

async function parseJson<T>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  return json;
}

export async function fetchLearningTasks(): Promise<LearningTask[]> {
  const token = await getBearer();
  const res = await fetch("/api/learning-tasks", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<LearningTask[]>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load tasks");
  return json.data;
}

export async function createLearningTask(
  body: Partial<LearningTask> & Pick<LearningTask, "title">
): Promise<LearningTask> {
  const token = await getBearer();
  const res = await fetch("/api/learning-tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await parseJson<LearningTask>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to create task");
  return json.data;
}

export async function updateLearningTask(
  id: string,
  patch: Partial<
    Pick<
      LearningTask,
      | "title"
      | "sessionKey"
      | "sessionLabel"
      | "sessionOrder"
      | "category"
      | "priority"
      | "progress"
      | "dueDate"
      | "notes"
      | "sortOrder"
    >
  >
): Promise<LearningTask> {
  const token = await getBearer();
  const res = await fetch(`/api/learning-tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await parseJson<LearningTask>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to update task");
  return json.data;
}

export async function deleteLearningTask(id: string): Promise<void> {
  const token = await getBearer();
  const res = await fetch(`/api/learning-tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.error || "Failed to delete task");
}

export async function fetchLearningTaskTemplates(): Promise<LearningTaskTemplate[]> {
  const token = await getBearer();
  const res = await fetch("/api/learning-task-templates", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<LearningTaskTemplate[]>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load templates");
  return json.data;
}

export async function importLearningTaskTemplates(importAllActive: boolean): Promise<{
  imported: number;
  skipped: number;
}> {
  const token = await getBearer();
  const res = await fetch("/api/learning-task-templates/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ importAllActive }),
  });
  const json = await parseJson<{ imported: number; skipped: number }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to import templates");
  return json.data;
}

export async function fetchAdminLearningTaskTemplates(): Promise<LearningTaskTemplate[]> {
  const token = await getBearer();
  const res = await fetch("/api/admin/learning-task-templates", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<LearningTaskTemplate[]>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load templates");
  return json.data;
}

export async function createAdminLearningTaskTemplate(
  body: Omit<LearningTaskTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<LearningTaskTemplate> {
  const token = await getBearer();
  const res = await fetch("/api/admin/learning-task-templates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await parseJson<LearningTaskTemplate>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to create template");
  return json.data;
}

export async function updateAdminLearningTaskTemplate(
  id: string,
  patch: Partial<
    Pick<
      LearningTaskTemplate,
      "sessionKey" | "sessionLabel" | "sessionOrder" | "title" | "category" | "sortOrder" | "active"
    >
  >
): Promise<LearningTaskTemplate> {
  const token = await getBearer();
  const res = await fetch(`/api/admin/learning-task-templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await parseJson<LearningTaskTemplate>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to update template");
  return json.data;
}

export async function deleteAdminLearningTaskTemplate(id: string): Promise<void> {
  const token = await getBearer();
  const res = await fetch(`/api/admin/learning-task-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.error || "Failed to delete template");
}

/** Admin-only API: deletes every row in `learningTaskTemplates`. Attendee copies are untouched. */
export async function clearAllAdminLearningTaskTemplates(): Promise<{ deleted: number }> {
  const token = await getBearer();
  const res = await fetch("/api/admin/learning-task-templates", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ deleted: number }>(res);
  if (!json.ok || json.data === undefined) throw new Error(json.error || "Failed to clear templates");
  return json.data;
}

export async function seedLearningTaskTemplates(): Promise<{ written: number }> {
  const token = await getBearer();
  const res = await fetch("/api/admin/learning-task-templates/seed", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ written: number }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to seed templates");
  return json.data;
}
