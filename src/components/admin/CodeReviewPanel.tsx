"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { CodeReviewCheck, CodeReviewWritten, ProjectCodeReview } from "@/types";
import { fetchCodeReview, rerunCodeReview } from "@/lib/codeReviewApi";

/**
 * Code review for one hackathon project, shown to judges inside ProjectDetailModal.
 * Describes what's in the repo so judges don't have to open GitHub. Never shows a score.
 */

type Tab = "overview" | "agent" | "code" | "checks" | "pitch";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "agent", label: "Agent design" },
  { id: "code", label: "Code & README" },
  { id: "checks", label: "Checks" },
  { id: "pitch", label: "For the pitch" },
];

const AGENT_KIND: Record<CodeReviewWritten["agent"]["kind"], { title: string; ok: boolean }> = {
  "adk-agent": { title: "Real ADK agent", ok: true },
  "other-agent-framework": { title: "Agent, but not ADK", ok: false },
  "single-model-call": { title: "Single model call, no agent", ok: false },
  "no-ai": { title: "No model found in the code", ok: false },
  unclear: { title: "Agent design unclear", ok: false },
};

const LANGUAGE_COLOURS = ["bg-green-400", "bg-amber-400", "bg-sky-400", "bg-fuchsia-400", "bg-gray-500"];

function timeLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{children}</span>;
}

function Where({ where }: { where?: string }) {
  if (!where) return null;
  return <span className="ml-1.5 text-[11px] font-mono text-green-400/80 break-all">{where}</span>;
}

function Tile({ ok, title, summary }: { ok: boolean; title: string; summary: string }) {
  return (
    <div className="bg-gray-950/40 border border-white/8 rounded-xl p-3">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 size={16} className="text-green-400 shrink-0" />
        ) : (
          <AlertTriangle size={16} className="text-amber-300 shrink-0" />
        )}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className={`text-xs mt-1.5 leading-relaxed ${ok ? "text-gray-400" : "text-amber-200/90"}`}>{summary}</p>
    </div>
  );
}

function CheckList({ checks }: { checks: CodeReviewCheck[] }) {
  return (
    <ul className="space-y-3">
      {checks.map((c) => (
        <li key={c.key} className="flex gap-2.5 text-sm leading-relaxed">
          {c.level === "ok" ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <span className="font-semibold text-white">{c.title}.</span>{" "}
            <span className="text-gray-300">{c.summary}.</span>
            {c.details.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-gray-400 list-disc pl-4 break-words">
                {c.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Where the panel gets its review from. Defaults to the portal API; the local preview page swaps it. */
export interface CodeReviewSource {
  load: () => Promise<ProjectCodeReview | null>;
  reviewAgain: () => Promise<void>;
}

export default function CodeReviewPanel({ projectId, source }: { projectId: string; source?: CodeReviewSource }) {
  const [review, setReview] = useState<ProjectCodeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const load = useCallback(async () => {
    try {
      setReview(await (source ? source.load() : fetchCodeReview(projectId)));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load the review.");
    } finally {
      setLoading(false);
    }
  }, [projectId, source]);

  useEffect(() => {
    setLoading(true);
    setTab("overview");
    void load();
  }, [load]);

  const inProgress = review?.status === "queued" || review?.status === "running";

  useEffect(() => {
    if (!inProgress) return;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [inProgress, load]);

  const reviewAgain = async () => {
    setRequesting(true);
    try {
      if (source) await source.reviewAgain();
      else await rerunCodeReview(projectId);
      await load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't start the review.");
    } finally {
      setRequesting(false);
    }
  };

  const result = review?.result ?? null;
  const written = result?.written ?? null;
  const stats = result?.stats;

  // ── Status line + button ──────────────────────────────────────────────────
  let statusLine: React.ReactNode = null;
  if (loading) statusLine = <span className="text-gray-500">Loading review…</span>;
  else if (review?.status === "running")
    statusLine = (
      <span className="inline-flex items-center gap-2 text-sky-300">
        <Loader2 size={14} className="animate-spin" /> Reading the latest code… usually about a minute
      </span>
    );
  else if (review?.status === "queued")
    statusLine = (
      <span className="inline-flex items-center gap-2 text-sky-300">
        <Circle size={12} /> Waiting for its turn{review.error ? ` · ${review.error}` : ""}
      </span>
    );
  else if (review?.status === "failed")
    statusLine = (
      <span className="inline-flex items-start gap-2 text-red-300">
        <XCircle size={14} className="shrink-0 mt-0.5" /> {review.error || "The review failed."}
      </span>
    );
  else if (result && stats)
    statusLine = (
      <span className="text-gray-500">
        Reviewed {timeLabel(result.reviewedAt)} · commit {stats.commitSha}
        {stats.lockedToDeadline ? " (last version before the deadline)" : ""} · read {stats.filesRead} of{" "}
        {stats.filesConsidered} files
      </span>
    );
  else if (!review) statusLine = <span className="text-gray-500">Not reviewed yet.</span>;

  const agentKind = written ? AGENT_KIND[written.agent.kind] : null;
  // Bars show lines added; if line counts weren't available, they show commits instead.
  const byLines = (stats?.hours ?? []).some((h) => h.lines > 0);
  const barValue = (h: { lines: number; commits: number }) => (byLines ? h.lines : h.commits);
  const maxBar = Math.max(1, ...(stats?.hours.map(barValue) ?? [0]));
  const offDay = Boolean(stats?.hoursDay?.includes("not the event day"));

  return (
    <section aria-label="Code review" className="pt-4 border-t border-white/8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>Code review</SectionLabel>
          <p className="text-xs font-mono mt-1 leading-relaxed">{statusLine}</p>
          {loadError && <p className="text-xs font-mono text-red-300 mt-1">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={reviewAgain}
          disabled={requesting || inProgress || loading}
          className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-mono font-semibold border border-green-500/30 hover:bg-green-500/10 px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RefreshCw size={13} className={requesting ? "animate-spin" : ""} />
          {review ? "Review again" : "Review now"}
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agentKind && written && (
              <Tile
                ok={agentKind.ok}
                title={agentKind.title}
                summary={`${written.agent.agents.length || "No"} sub-agent${written.agent.agents.length === 1 ? "" : "s"} · ${written.agent.framework}`}
              />
            )}
            {result.checks.map((c) => (
              <Tile key={c.key} ok={c.level === "ok"} title={c.title} summary={c.summary} />
            ))}
          </div>

          <div role="tablist" aria-label="Review sections" className="flex flex-wrap gap-1 bg-gray-950/50 border border-white/8 rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  tab === t.id ? "bg-green-500 text-gray-950 font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!written && (tab === "overview" || tab === "agent" || tab === "code" || tab === "pitch") && (
            <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Only the checks are available for this review{result.writtenError ? `: ${result.writtenError}` : "."} Try
              &ldquo;Review again&rdquo; in a minute.
            </p>
          )}

          {tab === "overview" && (
            <div className="space-y-4">
              {written && (
                <>
                  <div>
                    <SectionLabel>In short</SectionLabel>
                    <p className="text-sm text-gray-200 mt-1 leading-relaxed">{written.summary}</p>
                  </div>
                  <div>
                    <SectionLabel>Who it&apos;s for</SectionLabel>
                    <p className="text-sm text-gray-300 mt-1 leading-relaxed">{written.whoItsFor}</p>
                  </div>
                </>
              )}
              {stats && (
                <div>
                  <SectionLabel>Repo at a glance</SectionLabel>
                  <div className="mt-2 h-2 rounded-full overflow-hidden flex bg-white/5">
                    {stats.languages.map((l, i) => (
                      <span key={l.name} className={LANGUAGE_COLOURS[i % LANGUAGE_COLOURS.length]} style={{ width: `${l.percent}%` }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400 font-mono">
                    {stats.languages.map((l, i) => (
                      <span key={l.name} className="inline-flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${LANGUAGE_COLOURS[i % LANGUAGE_COLOURS.length]}`} />
                        {l.name} {l.percent}%
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {[
                      [stats.codeFiles, "code files"],
                      [stats.linesOfCode.toLocaleString("en-GB"), "lines of code"],
                      [stats.commits, "commits"],
                      [stats.contributors, "contributors"],
                    ].map(([value, label]) => (
                      <div key={String(label)} className="bg-gray-950/40 border border-white/8 rounded-lg px-3 py-2">
                        <div className="text-lg font-mono text-white">{value}</div>
                        <div className="text-[11px] text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "agent" && written && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">{written.agent.explanation}</p>
              {(written.agent.rootAgent || written.agent.agents.length > 0) && (
                <div className="flex flex-col items-center">
                  {written.agent.rootAgent && (
                    <>
                      <div className="max-w-full border border-green-500/40 bg-green-500/10 rounded-xl px-4 py-2 text-center">
                        <div className="font-mono text-sm font-bold text-green-300 break-all">{written.agent.rootAgent}</div>
                        {written.agent.rootType && <div className="text-[11px] text-gray-400">{written.agent.rootType}</div>}
                      </div>
                      {written.agent.agents.length > 0 && <div className="w-px h-4 bg-white/15" aria-hidden="true" />}
                    </>
                  )}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {written.agent.agents.map((a, i) => (
                      <div key={`${a.name}-${i}`} className="bg-gray-950/40 border border-white/10 rounded-xl p-3">
                        <div className="text-[11px] font-mono text-gray-500">STEP {i + 1} · {a.type}</div>
                        <div className="font-mono text-sm font-bold text-white mt-0.5 break-all">{a.name}</div>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">{a.does}</p>
                        {a.tools.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {a.tools.map((t) => (
                              <span key={t} className="text-[11px] font-mono text-amber-300 border border-amber-500/25 bg-amber-500/10 rounded px-1.5 py-0.5">
                                tool · {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <Where where={a.where} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <SectionLabel>ADK features used</SectionLabel>
                <ul className="mt-1 divide-y divide-white/5">
                  {written.agent.features.map((f) => (
                    <li key={f.name} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-sm">
                      <span className={f.used ? "text-gray-200" : "text-gray-500"}>
                        <span className={f.used ? "text-green-400" : "text-gray-600"}>{f.used ? "✓" : "–"}</span> {f.name}
                      </span>
                      <span className="text-[11px] font-mono text-green-400/80 break-all">{f.used ? f.where : "not used"}</span>
                    </li>
                  ))}
                </ul>
                {written.agent.model && (
                  <p className="text-xs text-gray-500 font-mono mt-2">Model in the code: {written.agent.model}</p>
                )}
              </div>
            </div>
          )}

          {tab === "code" && (
            <div className="space-y-4">
              {written && (
                <div>
                  <SectionLabel>Could someone else run it?</SectionLabel>
                  <ul className="mt-1.5 space-y-1">
                    {written.runnable.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className={r.ok ? "text-green-400" : "text-amber-300"}>{r.ok ? "✓" : "✕"}</span>
                        <span className="text-gray-300">{r.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stats && stats.tree.length > 0 && (
                <div>
                  <SectionLabel>Structure</SectionLabel>
                  <pre className="mt-1.5 p-3 bg-gray-950/60 border border-white/8 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
                    {stats.tree.join("\n")}
                  </pre>
                </div>
              )}
              {written && (
                <>
                  {[
                    { label: "Done well", items: written.quality.strengths, good: true },
                    { label: "Could be better", items: written.quality.issues, good: false },
                  ].map((group) =>
                    group.items.length > 0 ? (
                      <div key={group.label}>
                        <SectionLabel>{group.label}</SectionLabel>
                        <ul className="mt-1.5 space-y-1.5">
                          {group.items.map((x, i) => (
                            <li key={i} className="flex gap-2 text-sm leading-relaxed">
                              <span className={group.good ? "text-green-400" : "text-amber-300"}>{group.good ? "+" : "–"}</span>
                              <span className="text-gray-300">
                                {x.text}
                                <Where where={x.where} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  )}
                  {[
                    { label: "Security", items: written.security },
                    { label: "Responsible AI", items: written.responsibleAi },
                  ].map((group) =>
                    group.items.length > 0 ? (
                      <div key={group.label}>
                        <SectionLabel>{group.label}</SectionLabel>
                        <ul className="mt-1.5 space-y-1.5">
                          {group.items.map((x, i) => (
                            <li key={i} className="flex gap-2 text-sm leading-relaxed">
                              {x.level === "good" ? (
                                <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-1" />
                              ) : (
                                <AlertTriangle size={14} className="text-amber-300 shrink-0 mt-1" />
                              )}
                              <span className="text-gray-300">
                                {x.text}
                                <Where where={x.where} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  )}
                </>
              )}
            </div>
          )}

          {tab === "checks" && stats && (
            <div className="space-y-5">
              <div>
                <SectionLabel>When the code was written · {byLines ? "lines added" : "commits"} per hour</SectionLabel>
                {stats.hoursDay && (
                  <p className={`text-xs font-mono mt-1 ${offDay ? "text-amber-300" : "text-gray-500"}`}>
                    {stats.hoursDay}
                    {offDay ? ": no code was written during the event" : ""}
                  </p>
                )}
                <div
                  role="img"
                  aria-label={stats.hours.map((h) => `${h.label}: ${h.lines} lines`).join(", ")}
                  className="mt-2 h-28 flex items-end gap-1.5 border-b border-white/10 px-1"
                >
                  {stats.hours.map((h) => (
                    <div
                      key={h.label}
                      title={`${h.label}: ${h.lines} lines, ${h.commits} commit${h.commits === 1 ? "" : "s"}`}
                      className={`flex-1 rounded-t ${barValue(h) > 0 ? (offDay ? "bg-amber-400/80" : "bg-green-500/80") : "bg-white/10"}`}
                      style={{ height: `${Math.max(3, Math.round((barValue(h) / maxBar) * 100))}%` }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5 px-1 mt-1">
                  {stats.hours.map((h) => (
                    <span key={h.label} className="flex-1 text-center text-[10px] font-mono text-gray-500">
                      {h.label}
                    </span>
                  ))}
                </div>
              </div>
              <CheckList checks={result.checks} />
            </div>
          )}

          {tab === "pitch" && written && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "The product", items: written.pitchQuestions.product },
                { label: "The business", items: written.pitchQuestions.business },
              ].map((group) => (
                <div key={group.label}>
                  <SectionLabel>{group.label}</SectionLabel>
                  <ol className="mt-1.5 space-y-1.5 list-decimal pl-4 text-sm text-gray-200 leading-relaxed">
                    {group.items.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-600 font-mono">Reviews describe what&apos;s in the code. Judges give every score.</p>
        </>
      )}
    </section>
  );
}
