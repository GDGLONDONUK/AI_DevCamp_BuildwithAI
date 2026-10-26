"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { CodeReviewListItem, Project, ProjectCodeReview } from "@/types";
import ProjectDetailModal from "@/components/admin/ProjectDetailModal";
import CodeReviewBadge from "@/components/admin/CodeReviewBadge";
import type { CodeReviewSource } from "@/components/admin/CodeReviewPanel";

interface PreviewRow {
  id: string;
  project: Project;
  review: ProjectCodeReview;
}

async function runReview(project: Project): Promise<ProjectCodeReview> {
  const res = await fetch("/api/dev/code-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repoUrl: project.githubUrl,
      title: project.title,
      description: project.description,
      techStack: project.techStack,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(String(json?.error || `Preview request failed (${res.status})`));
  return json.data as ProjectCodeReview;
}

function toListItem(r: ProjectCodeReview): CodeReviewListItem {
  return {
    projectId: r.projectId,
    status: r.status,
    lookCloser: (r.result?.checks ?? []).filter((c) => c.level === "look").map((c) => c.title),
    agentKind: r.result?.written?.agent.kind,
  };
}

export default function CodeReviewPreview() {
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const busy = rows.some((r) => r.review.status === "running");

  // The open panel reads the latest rows through this ref (it polls while a review runs).
  const rowsRef = useRef<PreviewRow[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const updateRow = (id: string, review: ProjectCodeReview) => {
    rowsRef.current = rowsRef.current.map((r) => (r.id === id ? { ...r, review } : r));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, review } : r)));
  };

  const review = async (row: PreviewRow) => {
    updateRow(row.id, { ...row.review, status: "running" });
    try {
      updateRow(row.id, { ...(await runReview(row.project)), projectId: row.id });
    } catch (e) {
      updateRow(row.id, { ...row.review, status: "failed", error: e instanceof Error ? e.message : "Review failed" });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = repoUrl.trim();
    if (!/github\.com\/[^/]+\/[^/]+/i.test(url)) {
      setError("Paste a GitHub repo link, like https://github.com/owner/repo");
      return;
    }
    const id = `preview-${Date.now()}`;
    const project: Project = {
      id,
      userId: "preview",
      userName: "Preview team",
      title: title.trim() || url.replace(/^https?:\/\/(www\.)?github\.com\//i, ""),
      description: description.trim() || "(no description given)",
      techStack: [],
      githubUrl: url,
      submittedAt: new Date().toISOString(),
      status: "submitted",
      weekCompleted: 4,
    };
    const row: PreviewRow = {
      id,
      project,
      review: { projectId: id, repoUrl: url, status: "running", result: null, attempts: 0 },
    };
    rowsRef.current = [row, ...rowsRef.current];
    setRows((prev) => [row, ...prev]);
    setRepoUrl("");
    setTitle("");
    setDescription("");
    await review(row);
  };

  const viewing = rows.find((r) => r.id === viewingId) ?? null;

  // Stable per open project, so the panel doesn't reload on every render.
  const source = useMemo<CodeReviewSource | undefined>(() => {
    if (!viewingId) return undefined;
    return {
      load: async () => rowsRef.current.find((r) => r.id === viewingId)?.review ?? null,
      reviewAgain: async () => {
        const target = rowsRef.current.find((r) => r.id === viewingId);
        if (target) void review(target); // the panel polls while it runs
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `review` only uses refs and setters
  }, [viewingId]);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <p className="font-mono text-sm text-green-400/80 tracking-widest mb-2">
            <span className="text-green-500/40">{"// "}</span>LOCAL PREVIEW
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Code review preview</h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            Paste any public GitHub repo to see exactly what judges will see in Admin → Projects. This page only exists
            on your laptop: nothing is saved and nobody else can open it.
          </p>
        </div>

        <form onSubmit={submit} className="bg-gray-900/50 border border-white/8 rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title (optional)"
              className="w-full px-3 py-2 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description, as a team would write it (optional)"
              className="w-full px-3 py-2 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-gray-950 font-mono text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Reviewing…" : "Review this repo"}
            </button>
          </div>
          {error && <p className="text-sm text-red-300 font-mono">{error}</p>}
        </form>

        {rows.length === 0 && (
          <p className="text-center text-gray-500 py-10 font-mono">No repos reviewed yet. A review takes about a minute.</p>
        )}

        {rows.map((r) => (
          <div key={r.id} className="bg-gray-900/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-white">{r.project.title}</span>
              <span className="font-mono text-xs bg-white/8 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">
                Week {r.project.weekCompleted}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-gray-500 border border-white/10">
                {r.project.status}
              </span>
              <CodeReviewBadge item={toListItem(r.review)} />
            </div>
            <p className="text-sm text-gray-400">{r.project.userName}</p>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.project.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 items-center">
              <a href={r.project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline font-mono">
                GitHub →
              </a>
              <button
                type="button"
                onClick={() => setViewingId(r.id)}
                className="text-xs text-green-400 hover:text-green-300 font-mono font-semibold border border-green-500/30 hover:bg-green-500/10 px-2 py-1 rounded-lg transition-all"
              >
                Details &amp; status
              </button>
              {r.review.status === "running" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-sky-300 font-mono">
                  <Loader2 size={12} className="animate-spin" /> Reading the code… about a minute
                </span>
              )}
              {r.review.status === "failed" && <span className="text-xs text-red-300 font-mono">{r.review.error}</span>}
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <ProjectDetailModal
          project={viewing.project}
          onClose={() => setViewingId(null)}
          onSave={async () => undefined}
          codeReviewSource={source}
        />
      )}
    </div>
  );
}
