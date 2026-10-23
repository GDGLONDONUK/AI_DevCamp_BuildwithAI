/**
 * Client calls for hackathon code reviews (`/api/projects/[id]/code-review`, `/api/admin/code-reviews`).
 */

import { auth } from "@/lib/firebase";
import type { CodeReviewListItem, CodeReviewStatus, ProjectCodeReview } from "@/types";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function readJson<T>(res: Response, label: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(String(json?.error || `${label} failed`));
  return json.data as T;
}

/** Called by the submit page after a final project is saved. Never throws. */
export async function requestCodeReview(projectId: string): Promise<void> {
  try {
    await fetch(`/api/projects/${encodeURIComponent(projectId)}/code-review`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    });
  } catch {
    // Non-blocking — the admin Projects tab queues anything missed.
  }
}

export async function fetchCodeReview(projectId: string): Promise<ProjectCodeReview | null> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/code-review`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  return readJson<ProjectCodeReview | null>(res, "fetchCodeReview");
}

export async function rerunCodeReview(projectId: string): Promise<CodeReviewStatus> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/code-review`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ force: true }),
  });
  const data = await readJson<{ status: CodeReviewStatus }>(res, "rerunCodeReview");
  return data.status;
}

export async function fetchCodeReviewList(): Promise<CodeReviewListItem[]> {
  const res = await fetch("/api/admin/code-reviews", { headers: await authHeaders(), cache: "no-store" });
  return readJson<CodeReviewListItem[]>(res, "fetchCodeReviewList");
}
