"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlarmClock,
  ArrowDown,
  ArrowLeft,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Equal,
  Flame,
  Flag,
  History,
  LayoutGrid,
  Link2,
  MonitorPlay,
  MoreVertical,
  PlayCircle,
  Plus,
  Sparkles,
  Table2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SESSIONS as STATIC_SESSIONS } from "@/data/sessions";
import { useSessions } from "@/hooks/useSessions";
import type { LearningTask, LearningTaskPriority, LearningTaskProgress, Session } from "@/types";
import {
  createLearningTask,
  deleteLearningTask,
  fetchLearningTaskTemplates,
  fetchLearningTasks,
  importLearningTaskTemplates,
  updateLearningTask,
} from "@/lib/learningTasksApi";
import { LearningTasksListControls } from "@/features/learning-tasks/components/LearningTasksListControls";
import { LearningTaskCategoryPicker } from "@/features/learning-tasks/components/LearningTaskCategoryPicker";
import {
  DEFAULT_LEARNING_TASK_LIST_FILTERS,
  LEARNING_TASKS_PAGE_SIZE,
  filterLearningTasks,
  paginateLearningTasks,
  type LearningTaskListFilters,
} from "@/features/learning-tasks/domain/taskList";
import { TaskCategoryGlyph } from "@/features/learning-tasks/components/taskDisplayIcons";

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDue(iso?: string | Date | null): Date | null {
  if (!iso) return null;
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOverdue(task: LearningTask): boolean {
  const due = parseDue(task.dueDate ?? null);
  if (!due || task.progress === "done") return false;
  return due < startOfToday();
}

function isDueAhead(task: LearningTask): boolean {
  const due = parseDue(task.dueDate ?? null);
  if (!due || task.progress === "done") return false;
  return due >= startOfToday();
}

/** Numbered programme sessions from Firestore (fallback `sessions.ts`) plus General. */
function buildSessionPresets(sessions: Session[]): { key: string; label: string; order: number }[] {
  const list = sessions.length > 0 ? sessions : STATIC_SESSIONS;
  return [
    ...list
      .filter((s) => /^session-\d+$/.test(s.id))
      .map((s) => ({
        key: s.id,
        label: `Session ${s.number}`,
        order: s.number,
      })),
    { key: "general", label: "General", order: 999 },
  ];
}

function formatTimelineDayHeading(isoDay: string): string {
  const parts = isoDay.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDay;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type TasksViewMode = "table" | "cards" | "timeline";

const VIEW_STORAGE_KEY = "bwai_learning_tasks_view";

function loadStoredView(): TasksViewMode {
  if (typeof window === "undefined") return "table";
  const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
  if (v === "table" || v === "cards" || v === "timeline") return v;
  return "table";
}

function formatTaskDateTime(iso?: string | Date | null): string {
  if (!iso) return "Not recorded";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const PRIORITY_ICONS: Record<LearningTaskPriority, typeof ArrowDown> = {
  low: ArrowDown,
  medium: Equal,
  high: Flame,
};

function PriorityToggle({
  value,
  onChange,
  compact,
}: {
  value: LearningTaskPriority;
  onChange: (p: LearningTaskPriority) => void;
  compact?: boolean;
}) {
  const opts: LearningTaskPriority[] = ["low", "medium", "high"];
  const active: Record<LearningTaskPriority, string> = {
    low: "border-gray-400 bg-white/15 text-white shadow-[0_0_0_2px_rgba(156,163,175,0.35)]",
    medium:
      "border-amber-500/60 bg-amber-500/20 text-amber-50 shadow-[0_0_0_2px_rgba(245,158,11,0.25)]",
    high: "border-rose-500/60 bg-rose-500/20 text-rose-50 shadow-[0_0_0_2px_rgba(244,63,94,0.25)]",
  };
  const inactive = "border-white/10 bg-gray-900/40 text-gray-500 hover:bg-white/10 hover:text-gray-300";
  const pad = compact ? "px-2 py-1 text-[10px] min-w-[3rem]" : "px-3 py-2.5 text-xs flex-1";
  const iconSz = compact ? 12 : 15;
  return (
    <div className={`flex gap-1.5 ${compact ? "flex-wrap" : ""}`} role="group" aria-label="Priority">
      {opts.map((p) => {
        const Icon = PRIORITY_ICONS[p];
        const on = value === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(p)}
            className={`rounded-lg border font-semibold capitalize transition-all inline-flex items-center justify-center gap-1 ${pad} ${
              on ? active[p] : inactive
            }`}
          >
            <Icon size={iconSz} className={on ? "opacity-100 shrink-0" : "opacity-50 shrink-0"} aria-hidden />
            {compact ? ({ low: "Low", medium: "Med", high: "High" }[p]) : p}
          </button>
        );
      })}
    </div>
  );
}

const PROGRESS_ICONS: Record<LearningTaskProgress, typeof Circle> = {
  not_started: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
};

function ProgressToggle({
  value,
  onChange,
  compact,
}: {
  value: LearningTaskProgress;
  onChange: (p: LearningTaskProgress) => void;
  compact?: boolean;
}) {
  const meta: { value: LearningTaskProgress; label: string }[] = compact
    ? [
        { value: "not_started", label: "Todo" },
        { value: "in_progress", label: "Doing" },
        { value: "done", label: "Done" },
      ]
    : [
        { value: "not_started", label: "Not started" },
        { value: "in_progress", label: "In progress" },
        { value: "done", label: "Done" },
      ];
  const active: Record<LearningTaskProgress, string> = {
    not_started: "border-orange-500/45 bg-orange-500/15 text-orange-100 shadow-[0_0_0_2px_rgba(249,115,22,0.2)]",
    in_progress:
      "border-sky-500/45 bg-sky-500/15 text-sky-50 shadow-[0_0_0_2px_rgba(56,189,248,0.2)]",
    done: "border-emerald-500/45 bg-emerald-500/15 text-emerald-50 shadow-[0_0_0_2px_rgba(52,211,153,0.2)]",
  };
  const inactive = "border-white/10 bg-gray-900/40 text-gray-500 hover:bg-white/10 hover:text-gray-300";
  const pad = compact ? "px-2 py-1 text-[10px] flex-1 min-w-0" : "px-2 py-2.5 text-[11px] flex-1 leading-tight";
  const iconSz = compact ? 12 : 14;
  return (
    <div className="flex gap-1.5 w-full" role="group" aria-label="Progress">
      {meta.map(({ value: v, label }) => {
        const Icon = PROGRESS_ICONS[v];
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v)}
            className={`rounded-lg border font-semibold transition-all inline-flex items-center justify-center gap-1 ${pad} ${
              on ? active[v] : inactive
            }`}
          >
            <Icon size={iconSz} className={on ? "opacity-100 shrink-0" : "opacity-50 shrink-0"} aria-hidden />
            <span className={compact ? "truncate" : ""}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LinkifiedNotes({ text }: { text: string }) {
  const re = /(https?:\/\/[^\s]+)/gi;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`t-${i++}`}>{text.slice(last, match.index)}</span>);
    }
    const url = match[0];
    parts.push(
      <a
        key={`a-${i++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-400 hover:text-green-300 underline underline-offset-2 break-all font-medium"
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < text.length) {
    parts.push(<span key={`t-${i++}`}>{text.slice(last)}</span>);
  }
  return <span className="whitespace-pre-wrap break-words leading-relaxed">{parts}</span>;
}

function TaskActivityReadOnly({ task, embedded }: { task: LearningTask; embedded?: boolean }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-gray-400">
        <History size={15} className="text-gray-500 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Activity</span>
      </div>
      <dl className="space-y-2 text-xs">
        <div>
          <dt className="text-gray-500 mb-0.5">Created</dt>
          <dd className="text-gray-200">
            {formatTaskDateTime(task.createdAt ?? null)}
            {task.createdByLabel ? (
              <span className="text-gray-500"> · {task.createdByLabel}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-0.5">Last updated</dt>
          <dd className="text-gray-200">
            {formatTaskDateTime(task.updatedAt ?? null)}
            {task.updatedByLabel ? (
              <span className="text-gray-500"> · {task.updatedByLabel}</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </>
  );

  if (embedded) {
    return (
      <div className="pt-5 mt-4 border-t border-white/10 space-y-3">{body}</div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/40 p-4 space-y-3">{body}</div>
  );
}

export default function LearningTasksPage() {
  const { user, loading } = useAuth();
  const { sessions: liveSessions } = useSessions();
  const SESSION_PRESETS = useMemo(
    () => buildSessionPresets(liveSessions),
    [liveSessions]
  );
  const router = useRouter();
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<LearningTask | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSessionKey, setFormSessionKey] = useState<string>("general");
  const [formCategory, setFormCategory] = useState<string>("other");
  const [formPriority, setFormPriority] = useState<LearningTaskPriority>("medium");
  const [formProgress, setFormProgress] = useState<LearningTaskProgress>("not_started");
  const [formDue, setFormDue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TasksViewMode>("table");
  const [listFilters, setListFilters] = useState<LearningTaskListFilters>(() => ({
    ...DEFAULT_LEARNING_TASK_LIST_FILTERS,
  }));
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    setListPage(1);
  }, [listFilters]);

  useEffect(() => {
    setViewMode(loadStoredView());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [initialTasks, tpls] = await Promise.all([
        fetchLearningTasks(),
        fetchLearningTaskTemplates().catch(() => []),
      ]);
      let loadedTasks = initialTasks;

      // First visit with an empty list: copy programme templates into private tasks (skips duplicates).
      if (loadedTasks.length === 0 && tpls.length > 0) {
        try {
          const res = await importLearningTaskTemplates(true);
          if (res.imported > 0) {
            loadedTasks = await fetchLearningTasks();
            toast.success(
              `Added ${res.imported} suggested DevCamp tasks — edit, prioritise, or remove anything you like.`
            );
          }
        } catch (importErr) {
          console.error(importErr);
          toast.error(
            importErr instanceof Error ? importErr.message : "Could not add suggested tasks"
          );
        }
      }

      setTasks(loadedTasks);
      setTemplatesCount(tpls.length);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load tasks");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const filteredTasks = useMemo(
    () => filterLearningTasks(tasks, listFilters),
    [tasks, listFilters]
  );

  const pagination = useMemo(
    () => paginateLearningTasks(filteredTasks, listPage, LEARNING_TASKS_PAGE_SIZE),
    [filteredTasks, listPage]
  );

  useEffect(() => {
    if (pagination.page !== listPage) setListPage(pagination.page);
  }, [pagination.page, listPage]);

  const pageTasks = pagination.slice;

  const categoryExtrasFromTasks = useMemo(
    () => tasks.map((t) => t.category).filter((c): c is string => typeof c === "string" && !!c.trim()),
    [tasks]
  );

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.progress === "done").length;

    const high = filteredTasks.filter((t) => t.priority === "high");
    const highDone = high.filter((t) => t.progress === "done").length;

    const ahead = filteredTasks.filter(isDueAhead);
    const aheadDone = ahead.filter((t) => t.progress === "done").length;

    const overdueList = filteredTasks.filter(isOverdue);

    return {
      total,
      done,
      highDone,
      highTotal: high.length,
      aheadDone,
      aheadTotal: ahead.length,
      overdue: overdueList.length,
    };
  }, [filteredTasks]);

  /** Group dated tasks by calendar day (ISO date key) for timeline columns. */
  const timelineByDay = useMemo(() => {
    const byDay = new Map<string, LearningTask[]>();
    const undated: LearningTask[] = [];
    for (const t of filteredTasks) {
      const d = parseDue(t.dueDate ?? null);
      if (!d) {
        undated.push(t);
        continue;
      }
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const list = byDay.get(key) ?? [];
      list.push(t);
      byDay.set(key, list);
    }
    const sortedDays = [...byDay.keys()].sort();
    for (const k of sortedDays) {
      byDay.get(k)!.sort((a, b) => {
        const ta = parseDue(a.dueDate)?.getTime() ?? 0;
        const tb = parseDue(b.dueDate)?.getTime() ?? 0;
        return ta - tb;
      });
    }
    undated.sort((a, b) => {
      if (a.sessionOrder !== b.sessionOrder) return a.sessionOrder - b.sessionOrder;
      return a.sortOrder - b.sortOrder;
    });
    return { byDay, sortedDays, undated };
  }, [filteredTasks]);

  /** Current page only — card view is paginated like the table. */
  const tasksGroupedBySessionPage = useMemo(() => {
    const sorted = [...pageTasks].sort((a, b) => {
      if (a.sessionOrder !== b.sessionOrder) return a.sessionOrder - b.sessionOrder;
      return a.sortOrder - b.sortOrder;
    });
    const groups: { sessionKey: string; sessionLabel: string; items: LearningTask[] }[] = [];
    for (const t of sorted) {
      const last = groups[groups.length - 1];
      if (!last || last.sessionKey !== t.sessionKey) {
        groups.push({ sessionKey: t.sessionKey, sessionLabel: t.sessionLabel, items: [t] });
      } else {
        last.items.push(t);
      }
    }
    return groups;
  }, [pageTasks]);

  const sessionFilterOptions = useMemo(() => {
    const fromPresets = SESSION_PRESETS.map((s) => ({ key: s.key, label: s.label }));
    const seen = new Set<string>(fromPresets.map((p) => p.key));
    const extras: { key: string; label: string }[] = [];
    for (const t of tasks) {
      if (!seen.has(t.sessionKey)) {
        seen.add(t.sessionKey);
        extras.push({ key: t.sessionKey, label: t.sessionLabel || t.sessionKey });
      }
    }
    extras.sort((a, b) => a.label.localeCompare(b.label));
    return [{ key: "", label: "All sessions" }, ...fromPresets, ...extras];
  }, [tasks, SESSION_PRESETS]);

  const sessionSelectOptions = useMemo(() => {
    const base: { key: string; label: string; order: number }[] = SESSION_PRESETS.map((s) => ({
      key: s.key,
      label: s.label,
      order: s.order,
    }));
    if (editing && !base.some((s) => s.key === editing.sessionKey)) {
      base.push({
        key: editing.sessionKey,
        label: editing.sessionLabel,
        order: editing.sessionOrder,
      });
    }
    return base.sort((a, b) => a.order - b.order);
  }, [editing, SESSION_PRESETS]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle("");
    setFormSessionKey("general");
    setFormCategory("other");
    setFormPriority("medium");
    setFormProgress("not_started");
    setFormDue("");
    setFormNotes("");
    setPanelOpen(true);
  };

  const openEdit = (task: LearningTask) => {
    setEditing(task);
    setFormTitle(task.title);
    setFormSessionKey(task.sessionKey || "general");
    setFormCategory(task.category ?? "other");
    setFormPriority(task.priority ?? "medium");
    setFormProgress(task.progress ?? "not_started");
    setFormDue(task.dueDate ? String(task.dueDate).slice(0, 10) : "");
    setFormNotes(task.notes ?? "");
    setPanelOpen(true);
    setMenuTaskId(null);
  };

  const sessionMeta = (key: string) =>
    SESSION_PRESETS.find((s) => s.key === key) ?? {
      key,
      label: key === "general" ? "General" : key,
      order: 999,
    };

  const handleSave = async () => {
    const preset = sessionMeta(formSessionKey);
    try {
      if (editing) {
        const updated = await updateLearningTask(editing.id, {
          title: formTitle.trim(),
          sessionKey: preset.key,
          sessionLabel: preset.label,
          sessionOrder: preset.order,
          category: formCategory,
          priority: formPriority,
          progress: formProgress,
          dueDate: formDue ? new Date(formDue).toISOString() : null,
          notes: formNotes.trim(),
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success("Task updated");
      } else {
        const created = await createLearningTask({
          title: formTitle.trim(),
          sessionKey: preset.key,
          sessionLabel: preset.label,
          sessionOrder: preset.order,
          category: formCategory,
          priority: formPriority,
          progress: formProgress,
          dueDate: formDue ? new Date(formDue).toISOString() : undefined,
          notes: formNotes.trim(),
        });
        setTasks((prev) => [...prev, created].sort((a, b) => {
          if (a.sessionOrder !== b.sessionOrder) return a.sessionOrder - b.sessionOrder;
          return a.sortOrder - b.sortOrder;
        }));
        toast.success("Task created");
      }
      setPanelOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteLearningTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
      setMenuTaskId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleImport = async () => {
    try {
      const res = await importLearningTaskTemplates(true);
      toast.success(`Imported ${res.imported} suggested tasks (${res.skipped} already had)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const patchTask = useCallback(
    async (task: LearningTask, patch: Partial<Pick<LearningTask, "priority" | "progress">>) => {
      try {
        const updated = await updateLearningTask(task.id, patch);
        setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setEditing((prev) => (prev?.id === updated.id ? updated : prev));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update task");
      }
    },
    []
  );

  const badgeProgress = (p: LearningTaskProgress) => {
    const map = {
      not_started: "bg-orange-500/15 text-orange-300 border-orange-500/25",
      in_progress: "bg-sky-500/15 text-sky-300 border-sky-500/25",
      done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    };
    const Icon = PROGRESS_ICONS[p];
    const label = p.replace(/_/g, " ");
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border capitalize ${map[p]}`}
      >
        <Icon size={11} className="opacity-90 shrink-0" aria-hidden />
        {label}
      </span>
    );
  };

  const badgePriority = (pr: LearningTaskPriority) => {
    const map = {
      high: "text-rose-300 bg-rose-500/15 border-rose-500/25",
      medium: "text-amber-300 bg-amber-500/15 border-amber-500/25",
      low: "text-gray-400 bg-white/5 border-white/10",
    };
    const Icon = PRIORITY_ICONS[pr];
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border capitalize ${map[pr]}`}
      >
        <Icon size={11} className="opacity-90 shrink-0" aria-hidden />
        {pr}
      </span>
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard"
              className="mt-1 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-green-400" size={26} />
                Learning tasks
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-xl">
                Your private checklist. If it&apos;s empty, we add the suggested programme tasks — edit or
                drop anything you don&apos;t need. Priorities and due dates help you finish strong before
                DevCamp ends.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {templatesCount > 0 && (
              <button
                type="button"
                onClick={() => void handleImport()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/90 hover:bg-violet-600 text-white text-sm font-semibold border border-violet-400/30 transition-colors"
              >
                <Sparkles size={16} />
                Add suggested tasks ({templatesCount})
              </button>
            )}
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-gray-950 text-sm font-bold transition-colors"
            >
              <Plus size={18} />
              New task
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center">
                  <Flag size={18} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-200">Priority tasks</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.highDone}/{stats.highTotal || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.highTotal ? `${pct(stats.highDone, stats.highTotal)}% done (high priority)` : "No high-priority tasks yet"}
              </p>
            </div>

            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center">
                  <MonitorPlay size={18} className="text-sky-600" />
                </div>
                <span className="text-sm font-medium text-gray-200">Upcoming deadlines</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.aheadDone}/{stats.aheadTotal || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.aheadTotal ? `${pct(stats.aheadDone, stats.aheadTotal)}% ready` : "No future deadlines set"}
              </p>
            </div>

            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center">
                  <Calendar size={18} className="text-violet-600" />
                </div>
                <span className="text-sm font-medium text-gray-200">Overdue</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.overdue}</div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.overdue > 0
                  ? `${stats.overdue} open past due`
                  : "Nothing overdue"}
              </p>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center">
                  <AlarmClock size={18} className="text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-200">Overall progress</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.done}/{stats.total || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.total ? `${pct(stats.done, stats.total)}% complete` : "Add your first task"}
              </p>
            </div>
          </div>
        </div>

        {/* Task list — table / cards / timeline */}
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-5 py-4 border-b border-white/10">
            <div>
              <h2 className="font-bold text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-green-400" />
                Your tasks
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {viewMode === "table" && "Dense list · Order follows session, then checklist order"}
                {viewMode === "cards" && "Grouped by session · Open a card to edit"}
                {viewMode === "timeline" &&
                  "Columns are calendar days · Undated tasks appear at the bottom"}
              </p>
            </div>
            <div
              className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-950/90 border border-white/10 shrink-0"
              role="tablist"
              aria-label="Task layout"
            >
              {(
                [
                  { id: "table" as const, label: "Table", Icon: Table2 },
                  { id: "cards" as const, label: "Cards", Icon: LayoutGrid },
                  { id: "timeline" as const, label: "Timeline", Icon: CalendarDays },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === id}
                  onClick={() => setViewMode(id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === id
                      ? "bg-green-600 text-gray-950 shadow-md shadow-green-900/40"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>

          {!loadingData && tasks.length > 0 ? (
            <LearningTasksListControls
              filters={listFilters}
              onFiltersChange={setListFilters}
              sessionOptions={sessionFilterOptions}
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalFiltered={filteredTasks.length}
              onPageChange={setListPage}
              showPagination={viewMode !== "timeline"}
            />
          ) : null}

          {loadingData ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center px-4">
              <p className="text-gray-400 text-sm mb-4">
                No tasks yet. Import the suggested DevCamp checklist or add your own.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="text-green-400 hover:text-green-300 text-sm font-semibold"
              >
                Create a task →
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center px-4 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-4">
                No tasks match these filters. Clear filters or widen your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setListFilters({ ...DEFAULT_LEARNING_TASK_LIST_FILTERS });
                  setListPage(1);
                }}
                className="text-violet-400 hover:text-violet-300 text-sm font-semibold"
              >
                Clear all filters →
              </button>
            </div>
          ) : (
            <>
              {viewMode === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-white/10">
                        <th className="px-5 py-3 font-medium">Task</th>
                        <th className="px-5 py-3 font-medium whitespace-nowrap">Session</th>
                        <th className="px-5 py-3 font-medium whitespace-nowrap">Due</th>
                        <th className="px-5 py-3 font-medium whitespace-nowrap min-w-[10rem]">Priority</th>
                        <th className="px-5 py-3 font-medium whitespace-nowrap min-w-[11rem]">Progress</th>
                        <th className="px-5 py-3 font-medium whitespace-nowrap hidden xl:table-cell w-[13rem]">
                          Activity
                        </th>
                        <th className="px-5 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {pageTasks.map((t) => (
                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-5 py-3">
                            <div className="flex gap-3 items-start">
                              <TaskCategoryGlyph category={t.category} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(t)}
                                  className="text-left font-medium text-white hover:text-green-400 transition-colors"
                                >
                                  {t.title}
                                </button>
                                {t.notes ? (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.notes}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              {t.sessionKey === "general" ? (
                                <Sparkles size={14} className="text-amber-500/65 shrink-0" aria-hidden />
                              ) : (
                                <MonitorPlay size={14} className="text-sky-500/65 shrink-0" aria-hidden />
                              )}
                              {t.sessionLabel}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} className="text-gray-600 shrink-0 opacity-85" aria-hidden />
                              {t.dueDate
                                ? parseDue(String(t.dueDate))?.toLocaleDateString(undefined, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }) ?? "—"
                                : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <PriorityToggle
                              compact
                              value={t.priority}
                              onChange={(p) => void patchTask(t, { priority: p })}
                            />
                          </td>
                          <td className="px-5 py-3 align-middle">
                            <ProgressToggle
                              compact
                              value={t.progress}
                              onChange={(pr) => void patchTask(t, { progress: pr })}
                            />
                          </td>
                          <td className="px-5 py-3 align-top text-[11px] text-gray-400 hidden xl:table-cell w-[13rem]">
                            <div className="space-y-2 leading-snug">
                              <div>
                                <span className="text-gray-600 block text-[10px] uppercase tracking-wide">
                                  Created
                                </span>
                                <span className="text-gray-300">{formatTaskDateTime(t.createdAt ?? null)}</span>
                                {t.createdByLabel ? (
                                  <span className="text-gray-500 block truncate" title={t.createdByLabel}>
                                    {t.createdByLabel}
                                  </span>
                                ) : null}
                              </div>
                              <div>
                                <span className="text-gray-600 block text-[10px] uppercase tracking-wide">
                                  Updated
                                </span>
                                <span className="text-gray-300">{formatTaskDateTime(t.updatedAt ?? null)}</span>
                                {t.updatedByLabel ? (
                                  <span className="text-gray-500 block truncate" title={t.updatedByLabel}>
                                    {t.updatedByLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 relative">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10"
                              aria-label="Task actions"
                              onClick={() => setMenuTaskId((id) => (id === t.id ? null : t.id))}
                            >
                              <MoreVertical size={18} />
                            </button>
                            {menuTaskId === t.id && (
                              <>
                                <button
                                  type="button"
                                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                                  aria-label="Close menu"
                                  onClick={() => setMenuTaskId(null)}
                                />
                                <div className="absolute right-4 top-full mt-1 z-20 bg-gray-900 border border-white/15 rounded-xl shadow-xl py-1 min-w-[140px]">
                                  <button
                                    type="button"
                                    className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                                    onClick={() => openEdit(t)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    onClick={() => void handleDelete(t.id)}
                                  >
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === "cards" &&
                tasksGroupedBySessionPage.map((group) => (
                  <section
                    key={group.sessionKey}
                    className="px-5 py-8 border-b border-white/5 last:border-b-0"
                  >
                    <h3 className="text-xs font-mono uppercase tracking-wider text-green-400/90 mb-4 flex items-center gap-2">
                      {group.sessionKey === "general" ? (
                        <Sparkles size={14} className="text-amber-400/85 shrink-0" aria-hidden />
                      ) : (
                        <MonitorPlay size={14} className="text-green-400/85 shrink-0" aria-hidden />
                      )}
                      {group.sessionLabel}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.items.map((t) => (
                        <div
                          key={t.id}
                          className="relative rounded-xl border border-white/10 bg-gray-950/50 p-4 hover:border-green-500/25 transition-colors"
                        >
                          <div className="flex gap-3">
                            <TaskCategoryGlyph category={t.category} size={18} className="shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 relative">
                              <div className="flex justify-between gap-2 items-start">
                                <button
                                  type="button"
                                  onClick={() => openEdit(t)}
                                  className="text-left font-semibold text-white text-sm leading-snug hover:text-green-400 transition-colors flex-1 min-w-0 pr-2"
                                >
                                  {t.title}
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 shrink-0 -mr-1 -mt-1"
                                  aria-label="Task actions"
                                  onClick={() => setMenuTaskId((id) => (id === t.id ? null : t.id))}
                                >
                                  <MoreVertical size={18} />
                                </button>
                              </div>
                              {t.notes ? (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{t.notes}</p>
                              ) : null}
                              {menuTaskId === t.id && (
                                <>
                                  <button
                                    type="button"
                                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                                    aria-label="Close menu"
                                    onClick={() => setMenuTaskId(null)}
                                  />
                                  <div className="absolute right-0 top-8 z-20 bg-gray-900 border border-white/15 rounded-xl shadow-xl py-1 min-w-[140px]">
                                    <button
                                      type="button"
                                      className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                                      onClick={() => openEdit(t)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                      onClick={() => void handleDelete(t.id)}
                                    >
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                              <PriorityToggle
                                value={t.priority}
                                onChange={(p) => void patchTask(t, { priority: p })}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Progress</p>
                              <ProgressToggle
                                value={t.progress}
                                onChange={(pr) => void patchTask(t, { progress: pr })}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 items-center text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1 font-mono">
                                <CalendarDays size={13} className="text-gray-600 shrink-0 opacity-85" aria-hidden />
                                Due:{" "}
                                {t.dueDate
                                  ? parseDue(String(t.dueDate))?.toLocaleDateString(undefined, {
                                      day: "numeric",
                                      month: "short",
                                    }) ?? "—"
                                  : "—"}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-600 leading-relaxed pt-2 border-t border-white/5 space-y-1">
                              <p>
                                <span className="text-gray-500">Created </span>
                                {formatTaskDateTime(t.createdAt ?? null)}
                                {t.createdByLabel ? (
                                  <span className="text-gray-500"> · {t.createdByLabel}</span>
                                ) : null}
                              </p>
                              <p>
                                <span className="text-gray-500">Updated </span>
                                {formatTaskDateTime(t.updatedAt ?? null)}
                                {t.updatedByLabel ? (
                                  <span className="text-gray-500"> · {t.updatedByLabel}</span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

              {viewMode === "timeline" && (
                <div>
                  {timelineByDay.sortedDays.length === 0 ? (
                    <div className="px-5 py-8">
                      <p className="text-gray-400 text-sm mb-4">
                        No tasks have due dates yet. Add a due date when editing a task to see them
                        on the timeline, or switch to Table / Cards.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="flex min-h-[280px] items-stretch px-5 pt-8 pb-6 border-b border-white/5">
                        {timelineByDay.sortedDays.map((dayKey, idx) => (
                          <div
                            key={dayKey}
                            className={`flex-shrink-0 w-[248px] flex flex-col gap-3 px-5 border-l border-dashed border-white/25 ${idx === 0 ? "border-l-0 pl-0" : ""}`}
                          >
                            <header className="pb-3 border-b border-white/10">
                              <p className="text-[10px] font-mono text-violet-400/90">{dayKey}</p>
                              <p className="text-base font-bold text-white leading-tight">
                                {formatTimelineDayHeading(dayKey)}
                              </p>
                            </header>
                            <div className="flex flex-col gap-2 flex-1">
                              {(timelineByDay.byDay.get(dayKey) ?? []).map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => openEdit(t)}
                                  className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                                    t.progress === "done"
                                      ? "bg-white/5 border-white/10 opacity-75"
                                      : "bg-violet-600/15 border-violet-500/30 hover:bg-violet-600/28"
                                  }`}
                                >
                                  <div className="flex gap-2 mb-2 items-start">
                                    <TaskCategoryGlyph category={t.category} size={14} compact className="shrink-0" />
                                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                                      {badgePriority(t.priority)}
                                      {badgeProgress(t.progress)}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-100 font-medium leading-snug line-clamp-4 pl-[2px]">
                                    {t.title}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-2 font-mono inline-flex items-center gap-1">
                                    {t.sessionKey === "general" ? (
                                      <Sparkles size={11} className="text-amber-500/55 shrink-0" aria-hidden />
                                    ) : (
                                      <MonitorPlay size={11} className="text-sky-500/55 shrink-0" aria-hidden />
                                    )}
                                    {t.sessionLabel}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {timelineByDay.undated.length > 0 && (
                    <div className="px-5 py-8">
                      <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                        <Calendar size={17} className="text-gray-500 shrink-0" />
                        No due date ({timelineByDay.undated.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {timelineByDay.undated.map((t) => (
                          <div
                            key={t.id}
                            className="relative rounded-xl border border-white/10 bg-gray-950/40 p-4 hover:border-white/20 transition-colors"
                          >
                            <div className="flex gap-3">
                              <TaskCategoryGlyph category={t.category} size={17} className="shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 relative">
                                <div className="flex justify-between gap-2 items-start">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(t)}
                                    className="text-left font-semibold text-white text-sm hover:text-green-400 transition-colors flex-1 min-w-0 pr-2"
                                  >
                                    {t.title}
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 shrink-0 -mr-1 -mt-1"
                                    aria-label="Task actions"
                                    onClick={() => setMenuTaskId((id) => (id === t.id ? null : t.id))}
                                  >
                                    <MoreVertical size={18} />
                                  </button>
                                </div>
                                {menuTaskId === t.id && (
                                  <>
                                    <button
                                      type="button"
                                      className="fixed inset-0 z-10 cursor-default bg-transparent"
                                      aria-label="Close menu"
                                      onClick={() => setMenuTaskId(null)}
                                    />
                                    <div className="absolute right-0 top-8 z-20 bg-gray-900 border border-white/15 rounded-xl shadow-xl py-1 min-w-[140px]">
                                      <button
                                        type="button"
                                        className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                                        onClick={() => openEdit(t)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                        onClick={() => void handleDelete(t.id)}
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                                <div className="flex flex-wrap gap-2 mt-3 pb-2 border-b border-white/5 items-center">
                                  {badgePriority(t.priority)}
                                  {badgeProgress(t.progress)}
                                  <span className="text-[10px] text-gray-500 ml-auto inline-flex items-center gap-1">
                                    {t.sessionKey === "general" ? (
                                      <Sparkles size={11} className="text-amber-500/55 shrink-0" aria-hidden />
                                    ) : (
                                      <MonitorPlay size={11} className="text-sky-500/55 shrink-0" aria-hidden />
                                    )}
                                    {t.sessionLabel}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-600 leading-relaxed mt-2 space-y-0.5">
                                  <p>
                                    Created {formatTaskDateTime(t.createdAt ?? null)}
                                    {t.createdByLabel ? ` · ${t.createdByLabel}` : ""}
                                  </p>
                                  <p>
                                    Updated {formatTaskDateTime(t.updatedAt ?? null)}
                                    {t.updatedByLabel ? ` · ${t.updatedByLabel}` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setPanelOpen(false)}
          />
          <div className="fixed z-50 right-0 top-0 bottom-0 w-full max-w-lg bg-gray-950 border-l border-white/10 shadow-2xl overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{editing ? "Edit task" : "New task"}</h3>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="text-gray-500 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Title</span>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  placeholder="e.g. Finish Session 2 assignment"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Session</span>
                <select
                  value={formSessionKey}
                  onChange={(e) => setFormSessionKey(e.target.value)}
                  className="w-full bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                  {sessionSelectOptions.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <LearningTaskCategoryPicker
                value={formCategory}
                onChange={setFormCategory}
                extraSuggestions={categoryExtrasFromTasks}
              />

              <div className="space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Priority</span>
                <PriorityToggle value={formPriority} onChange={setFormPriority} />
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Progress</span>
                <ProgressToggle value={formProgress} onChange={setFormProgress} />
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Due date (optional)</span>
                <input
                  type="date"
                  value={formDue}
                  onChange={(e) => setFormDue(e.target.value)}
                  className="w-full bg-gray-900 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                />
              </label>

              {/* Detail: notes + link preview + activity */}
              <div className="rounded-xl border border-green-500/25 bg-gray-900/45 overflow-hidden shadow-inner shadow-black/20">
                <div className="px-4 py-3 border-b border-white/10 bg-green-500/[0.06] flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-green-500/15 p-2 border border-green-500/20">
                    <Link2 size={16} className="text-green-400 shrink-0" aria-hidden />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Task detail</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Notes and pasted URLs (preview below). Activity shows when this row was created or last
                      saved.
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="task-notes" className="sr-only">
                      Notes and links
                    </label>
                    <span id="task-notes-label" className="text-xs text-gray-500 uppercase tracking-wide">
                      Notes & links
                    </span>
                    <textarea
                      id="task-notes"
                      aria-labelledby="task-notes-label"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={5}
                      className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-green-500/40 placeholder:text-gray-600"
                      placeholder="Paste resource URLs, Markdown-style reminders, or anything you need next time you open this task…"
                    />
                    {formNotes.trim() ? (
                      <div className="rounded-lg border border-white/10 bg-gray-950/70 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
                          Preview · links open in a new tab
                        </p>
                        <div className="text-sm text-gray-200">
                          <LinkifiedNotes text={formNotes} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-600 italic">No notes yet — add URLs or reminders above.</p>
                    )}
                  </div>

                  {editing ? (
                    <TaskActivityReadOnly task={editing} embedded />
                  ) : (
                    <p className="text-[11px] text-gray-500 leading-relaxed pt-2 border-t border-white/10">
                      Once this task is saved, created / updated timestamps and your profile name appear under{" "}
                      <span className="text-gray-400">Activity</span>.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!formTitle.trim()}
                onClick={() => void handleSave()}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:pointer-events-none text-gray-950 font-bold text-sm"
              >
                {editing ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
