"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { LearningTaskTemplate } from "@/types";
import { LearningTaskCategoryPicker } from "@/features/learning-tasks/components/LearningTaskCategoryPicker";
import {
  labelLearningTaskCategory,
  learningTaskCategoryChipClass,
} from "@/features/learning-tasks/domain/categoryPresets";
import {
  clearAllAdminLearningTaskTemplates,
  createAdminLearningTaskTemplate,
  deleteAdminLearningTaskTemplate,
  fetchAdminLearningTaskTemplates,
  seedLearningTaskTemplates,
  updateAdminLearningTaskTemplate,
} from "@/lib/learningTasksApi";

export default function AdminLearningTasksPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<LearningTaskTemplate[]>([]);
  const [busy, setBusy] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [formSessionKey, setFormSessionKey] = useState("session-4");
  const [formSessionLabel, setFormSessionLabel] = useState("Session 4");
  const [formSessionOrder, setFormSessionOrder] = useState(4);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<string>("resource");
  const [formSortOrder, setFormSortOrder] = useState(10);

  const categoryExtrasFromTemplates = useMemo(
    () => rows.map((r) => r.category).filter((c) => typeof c === "string" && !!c.trim()),
    [rows]
  );

  const allowed = userProfile?.role === "admin" || userProfile?.role === "moderator";
  const isAdmin = userProfile?.role === "admin";

  const refresh = useCallback(async () => {
    if (!user || !allowed) return;
    setBusy(true);
    try {
      const data = await fetchAdminLearningTaskTemplates();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setBusy(false);
    }
  }, [user, allowed]);

  useEffect(() => {
    if (!loading && (!user || !allowed)) router.push("/");
  }, [user, userProfile, loading, allowed, router]);

  useEffect(() => {
    if (user && allowed) void refresh();
  }, [user, allowed, refresh]);

  const resetCreateForm = useCallback(() => {
    setEditingTemplateId(null);
    setFormSessionKey("session-4");
    setFormSessionLabel("Session 4");
    setFormSessionOrder(4);
    setFormTitle("");
    setFormCategory("resource");
    setFormSortOrder(10);
  }, []);

  const beginEdit = (row: LearningTaskTemplate) => {
    setEditingTemplateId(row.id);
    setFormSessionKey(row.sessionKey);
    setFormSessionLabel(row.sessionLabel);
    setFormSessionOrder(row.sessionOrder);
    setFormTitle(row.title);
    setFormCategory(row.category ?? "other");
    setFormSortOrder(row.sortOrder);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedLearningTaskTemplates();
      toast.success(`Upserted ${res.written} default rows (existing ids merged)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleClearCatalogue = async () => {
    if (
      !confirm(
        "Delete EVERY template in the catalogue? This cannot be undone. Attendee learning tasks are not removed."
      )
    )
      return;
    setClearing(true);
    try {
      const res = await clearAllAdminLearningTaskTemplates();
      toast.success(`Removed ${res.deleted} template${res.deleted === 1 ? "" : "s"}`);
      resetCreateForm();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  };

  const handleClearAndReseed = async () => {
    if (
      !confirm(
        "Clear the entire catalogue, then insert default bootcamp templates? Attendee tasks are not affected."
      )
    )
      return;
    setClearing(true);
    setSeeding(true);
    try {
      const cleared = await clearAllAdminLearningTaskTemplates();
      const seeded = await seedLearningTaskTemplates();
      toast.success(`Removed ${cleared.deleted}, then wrote ${seeded.written} default rows`);
      resetCreateForm();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setClearing(false);
      setSeeding(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formTitle.trim()) {
      toast.error("Title required");
      return;
    }
    try {
      if (editingTemplateId) {
        await updateAdminLearningTaskTemplate(editingTemplateId, {
          sessionKey: formSessionKey.trim(),
          sessionLabel: formSessionLabel.trim(),
          sessionOrder: formSessionOrder,
          title: formTitle.trim(),
          category: formCategory,
          sortOrder: formSortOrder,
        });
        toast.success("Template updated");
        resetCreateForm();
      } else {
        await createAdminLearningTaskTemplate({
          sessionKey: formSessionKey.trim(),
          sessionLabel: formSessionLabel.trim(),
          sessionOrder: formSessionOrder,
          title: formTitle.trim(),
          category: formCategory,
          sortOrder: formSortOrder,
          active: true,
        });
        toast.success("Template added");
        setFormTitle("");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const toggleActive = async (row: LearningTaskTemplate) => {
    try {
      await updateAdminLearningTaskTemplate(row.id, { active: !row.active });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template? Attendee copies stay in their own lists.")) return;
    try {
      await deleteAdminLearningTaskTemplate(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (id === editingTemplateId) resetCreateForm();
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading || !user || !allowed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/admin"
              className="mt-1 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                <ClipboardList className="text-amber-400" size={22} />
                Learning task templates
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Catalogue rows attendees can import into their private checklist. Moderators use this page too (bookmark if you don&apos;t see Admin in the nav).
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end shrink-0">
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={seeding || clearing}
                onClick={() => void handleSeed()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-sm font-semibold disabled:opacity-45"
              >
                <Upload size={16} className={seeding ? "animate-pulse" : ""} />
                {seeding ? "Seeding…" : "Re-seed defaults"}
              </button>
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    disabled={clearing || seeding || busy}
                    onClick={() => void handleClearCatalogue()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/35 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-sm font-semibold disabled:opacity-45"
                  >
                    <Trash2 size={16} />
                    {clearing ? "Working…" : "Clear catalogue"}
                  </button>
                  <button
                    type="button"
                    disabled={clearing || seeding || busy}
                    onClick={() => void handleClearAndReseed()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/18 text-orange-200 text-sm font-semibold disabled:opacity-45"
                  >
                    <RotateCcw size={16} />
                    Reset to defaults
                  </button>
                </>
              ) : null}
            </div>
            <p className="text-[11px] text-gray-600 max-w-xs sm:text-right leading-snug">
              Re-seed upserts rows by id (merge). Clear deletes every catalogue template; attendee tasks are
              unchanged.
            </p>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex flex-wrap items-center gap-2 gap-y-1">
            {editingTemplateId ? (
              <>
                <Pencil size={18} className="text-sky-400 shrink-0" /> Edit template
                <span className="text-[11px] font-mono text-gray-500 font-normal truncate max-w-[16rem] sm:max-w-xs">
                  {editingTemplateId}
                </span>
              </>
            ) : (
              <>
                <Plus size={18} className="text-green-400 shrink-0" /> Add template
              </>
            )}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] text-gray-500 uppercase">Session key</span>
              <input
                value={formSessionKey}
                onChange={(e) => setFormSessionKey(e.target.value)}
                className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="session-4"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-gray-500 uppercase">Session label</span>
              <input
                value={formSessionLabel}
                onChange={(e) => setFormSessionLabel(e.target.value)}
                className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Session 4"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-gray-500 uppercase">Session order #</span>
              <input
                type="number"
                min={0}
                max={999}
                value={formSessionOrder}
                onChange={(e) => setFormSessionOrder(Number(e.target.value))}
                className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-[11px] text-gray-500 uppercase">Title</span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="e.g. Session 4 watch recording"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <LearningTaskCategoryPicker
                value={formCategory}
                onChange={setFormCategory}
                extraSuggestions={categoryExtrasFromTemplates}
              />
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] text-gray-500 uppercase">Sort order</span>
              <input
                type="number"
                min={0}
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
                className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingTemplateId ? (
              <button
                type="button"
                onClick={() => resetCreateForm()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-gray-950 text-gray-300 text-sm font-medium hover:bg-white/10"
              >
                <XCircle size={16} aria-hidden />
                Cancel edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSaveTemplate()}
              className="bg-green-600 hover:bg-green-500 text-gray-950 font-bold px-5 py-2.5 rounded-lg text-sm"
            >
              {editingTemplateId ? "Update template" : "Save template"}
            </button>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-bold text-white">All templates ({rows.length})</h2>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {busy ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-green-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="px-5 py-3 font-medium">Session</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Active</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-gray-300 whitespace-nowrap">{r.sessionLabel}</td>
                      <td className="px-5 py-3 text-white max-w-xs truncate">{r.title}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${learningTaskCategoryChipClass(r.category)}`}
                        >
                          {labelLearningTaskCategory(r.category)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => void toggleActive(r)}
                          className={`text-[11px] px-2 py-1 rounded-full border font-medium ${
                            r.active
                              ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                              : "border-white/15 text-gray-500 bg-white/5"
                          }`}
                        >
                          {r.active ? "Active" : "Off"}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => beginEdit(r)}
                            className="p-2 rounded-lg text-gray-500 hover:text-sky-400 hover:bg-sky-500/10"
                            aria-label={`Edit template ${r.title}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(r.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                            aria-label={`Delete template ${r.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
