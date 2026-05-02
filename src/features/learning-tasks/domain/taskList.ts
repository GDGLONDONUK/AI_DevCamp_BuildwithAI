/**
 * Learning tasks list — pure domain helpers (filter + pagination).
 *
 * Security note: Filtering happens client-side on data already scoped to the signed-in user by the API
 * (`GET /api/learning-tasks` uses Firebase Auth + Firestore userId match). These functions never widen scope.
 */

import type { LearningTask, LearningTaskPriority, LearningTaskProgress } from "@/types";

/** Items per page for table and card (grid) views; timeline lists all filtered tasks. */
export const LEARNING_TASKS_PAGE_SIZE = 10;

export type LearningTaskListFilters = {
  /** Case-insensitive match against title + notes */
  query: string;
  /** Empty string = all sessions */
  sessionKey: string;
  priority: "" | LearningTaskPriority;
  progress: "" | LearningTaskProgress;
};

export const DEFAULT_LEARNING_TASK_LIST_FILTERS: LearningTaskListFilters = {
  query: "",
  sessionKey: "",
  priority: "",
  progress: "",
};

export function learningTaskListFiltersActive(f: LearningTaskListFilters): boolean {
  return !!(f.query.trim() || f.sessionKey || f.priority || f.progress);
}

export function filterLearningTasks(
  tasks: LearningTask[],
  f: LearningTaskListFilters
): LearningTask[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.sessionKey && t.sessionKey !== f.sessionKey) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.progress && t.progress !== f.progress) return false;
    if (q) {
      const hay = `${t.title}\n${t.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type PaginatedSlice<T> = {
  slice: T[];
  totalItems: number;
  totalPages: number;
  /** 1-based page index after clamping */
  page: number;
};

export function paginateLearningTasks<T>(
  items: T[],
  page: number,
  pageSize: number = LEARNING_TASKS_PAGE_SIZE
): PaginatedSlice<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { slice, totalItems, totalPages, page: clampedPage };
}
