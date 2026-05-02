"use client";

import { ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import type { LearningTaskListFilters } from "../domain/taskList";
import {
  DEFAULT_LEARNING_TASK_LIST_FILTERS,
  LEARNING_TASKS_PAGE_SIZE,
  learningTaskListFiltersActive,
} from "../domain/taskList";
import type { LearningTaskPriority, LearningTaskProgress } from "@/types";

export type SessionFilterOption = { key: string; label: string };

type Props = {
  filters: LearningTaskListFilters;
  onFiltersChange: (next: LearningTaskListFilters) => void;
  sessionOptions: SessionFilterOption[];
  /** Current page from domain pagination (clamped). */
  page: number;
  totalPages: number;
  totalFiltered: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** Timeline shows all filtered tasks; table/cards use pages. */
  showPagination: boolean;
};

export function LearningTasksListControls({
  filters,
  onFiltersChange,
  sessionOptions,
  page,
  totalPages,
  totalFiltered,
  pageSize = LEARNING_TASKS_PAGE_SIZE,
  onPageChange,
  showPagination,
}: Props) {
  const ps = pageSize;
  const from = totalFiltered === 0 ? 0 : (page - 1) * ps + 1;
  const to = Math.min(page * ps, totalFiltered);
  const filtersOn = learningTaskListFiltersActive(filters);

  const clearFilters = () => {
    onFiltersChange({ ...DEFAULT_LEARNING_TASK_LIST_FILTERS });
    onPageChange(1);
  };

  return (
    <div className="border-t border-white/10 bg-gray-950/40 px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-gray-400">
        <Filter size={14} className="text-green-500/90 shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Filters
        </span>
        {filtersOn && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 ml-auto text-[11px] text-violet-400 hover:text-violet-300 font-medium"
          >
            <X size={12} aria-hidden /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="relative block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) =>
              onFiltersChange({ ...filters, query: e.target.value })
            }
            placeholder="Search title & notes…"
            className="w-full bg-gray-900 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/35"
          />
        </label>

        <select
          value={filters.sessionKey}
          onChange={(e) =>
            onFiltersChange({ ...filters, sessionKey: e.target.value })
          }
          className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/35"
          aria-label="Filter by session"
        >
          {sessionOptions.map((s) => (
            <option key={s.key || "all"} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              priority: e.target.value as LearningTaskPriority | "",
            })
          }
          className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/35"
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.progress}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              progress: e.target.value as LearningTaskProgress | "",
            })
          }
          className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/35"
          aria-label="Filter by progress"
        >
          <option value="">All progress</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-white/5">
        <p className="text-[11px] text-gray-500 font-mono">
          {totalFiltered === 0
            ? "No tasks match these filters"
            : showPagination
              ? `Showing ${from}–${to} of ${totalFiltered}`
              : `${totalFiltered} task${totalFiltered === 1 ? "" : "s"} match filters · timeline shows all`}
        </p>

        {showPagination && totalFiltered > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-gray-900 text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} aria-hidden /> Prev
            </button>
            <span className="text-xs text-gray-400 font-mono px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 bg-gray-900 text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none"
            >
              Next <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
