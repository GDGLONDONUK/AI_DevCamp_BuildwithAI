"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw, XCircle } from "lucide-react";
import type { CodeReviewWritten, ProjectCodeReview } from "@/types";
import { fetchCodeReview, rerunCodeReview } from "@/lib/codeReviewApi";

/**
 * Short code review for one hackathon project, inside ProjectDetailModal.
 * Written by the background agent after the team ships. Facts only — judges give every score.
 */

const AGENT_KIND: Record<CodeReviewWritten["agentKind"], { label: string; ok: boolean }> = {
  "adk-agent": { label: "ADK agent", ok: true },
  "other-agent-framework": { label: "Agent, not ADK", ok: false },
  "single-model-call": { label: "Thin wrapper (one model call)", ok: false },
  "no-ai": { label: "No model in the code", ok: false },
  unclear: { label: "Agent design unclear", ok: false },
};

function timeLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  });
}

/** Shows `code` spans in a code font (older reviews used backticks) and drops other markdown marks. */
function Rich({ text }: { text: string }) {
  const parts = text.replace(/\*\*/g, "").split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="font-mono text-[0.85em] text-green-300/90 bg-white/5 rounded px-1 py-0.5 break-all">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{children}</span>;
}

export default function CodeReviewSummary({ projectId }: { projectId: string }) {
  const [review, setReview] = useState<ProjectCodeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    try {
      setReview(await fetchCodeReview(projectId));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load the review.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
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
      await rerunCodeReview(projectId);
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
  const flags = result?.checks.filter((c) => c.level === "look") ?? [];
  const history = result?.checks.find((c) => c.level === "info");
  const kind = written ? AGENT_KIND[written.agentKind] : null;

  let status: React.ReactNode = null;
  if (loading) status = <span className="text-gray-500">Loading…</span>;
  else if (review?.status === "running")
    status = (
      <span className="inline-flex items-center gap-1.5 text-sky-300">
        <Loader2 size={12} className="animate-spin" /> Reading the code… about a minute
      </span>
    );
  else if (review?.status === "queued")
    status = (
      <span className="inline-flex items-center gap-1.5 text-sky-300">
        <Circle size={10} /> Waiting for its turn
      </span>
    );
  else if (review?.status === "failed")
    status = (
      <span className="inline-flex items-start gap-1.5 text-red-300">
        <XCircle size={12} className="shrink-0 mt-0.5" /> {review.error || "The review failed."}
      </span>
    );
  else if (result) status = <span className="text-gray-500">Reviewed {timeLabel(result.reviewedAt)}</span>;
  else status = <span className="text-gray-500">Not reviewed yet — starts when the team ships the project.</span>;

  return (
    <section aria-label="Code review" className="pt-4 border-t border-white/8 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Label>Code review</Label>
          <p className="text-xs font-mono mt-1 leading-relaxed">{status}</p>
          {loadError && <p className="text-xs font-mono text-red-300 mt-1">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={reviewAgain}
          disabled={requesting || inProgress || loading}
          className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-mono font-semibold border border-green-500/30 hover:bg-green-500/10 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RefreshCw size={12} className={requesting ? "animate-spin" : ""} />
          {review ? "Review again" : "Review now"}
        </button>
      </div>

      {result && (
        <div className="bg-gray-950/40 border border-white/8 rounded-xl p-4 space-y-3">
          {flags.length > 0 || (kind && !kind.ok) ? (
            <div className="space-y-1.5">
              {kind && !kind.ok && (
                <p className="flex gap-2 text-sm text-amber-200">
                  <AlertTriangle size={15} className="text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">{kind.label}.</span>
                  </span>
                </p>
              )}
              {flags.map((f) => (
                <div key={f.key} className="flex gap-2 text-sm">
                  <AlertTriangle size={15} className="text-amber-300 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold text-amber-200">{f.title}.</span>{" "}
                    <span className="text-gray-300">{f.summary}.</span>
                    {f.details.length > 0 && (
                      <ul className="mt-0.5 text-xs text-gray-400 list-disc pl-4 space-y-0.5 break-words">
                        {f.details.slice(0, 3).map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-green-300">
              <CheckCircle2 size={15} className="shrink-0" />
              {kind ? `${kind.label} · ` : ""}No copying, hidden instructions, leaked keys or late pushes found
            </p>
          )}

          {written ? (
            <>
              <p className="text-sm text-gray-200 leading-relaxed">
                <Rich text={written.summary} />
              </p>
              <dl className="grid sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
                {[
                  ["Technical depth", written.technicalDepth],
                  ["Originality", written.originality],
                  ["Demo clarity", written.demoClarity],
                ].map(([label, text]) => (
                  <div key={label} className="contents">
                    <dt className="text-xs font-mono text-gray-500 pt-0.5">{label}</dt>
                    <dd className="text-gray-300 leading-relaxed">
                      <Rich text={text} />
                    </dd>
                  </div>
                ))}
              </dl>
              {written.concerns.length > 0 && (
                <div>
                  <Label>Worth checking</Label>
                  <ul className="mt-1 space-y-1 text-sm text-gray-300">
                    {written.concerns.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-300">–</span>
                        <span>
                          <Rich text={c.text} />
                          {c.where && <span className="ml-1.5 text-[11px] font-mono text-green-400/80 break-all">{c.where}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {written.pitchQuestions.length > 0 && (
                <div>
                  <Label>Ask at the pitch</Label>
                  <ol className="mt-1 space-y-1 list-decimal pl-5 text-sm text-gray-200">
                    {written.pitchQuestions.slice(0, 3).map((q, i) => (
                      <li key={i}>
                        <Rich text={q} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-200/90">
              The checks are ready, but the written summary isn&apos;t
              {result.writtenError && !/review again/i.test(result.writtenError) ? ` (${result.writtenError.replace(/\.$/, "")})` : ""}
              . Try &ldquo;Review again&rdquo; in a minute.
            </p>
          )}

          {stats && (
            <p className="text-[11px] font-mono text-gray-500 leading-relaxed pt-2 border-t border-white/5">
              {[
                stats.languages.slice(0, 2).map((l) => `${l.name} ${l.percent}%`).join(", "),
                `${stats.linesOfCode.toLocaleString("en-GB")} lines`,
                `${stats.commits} commit${stats.commits === 1 ? "" : "s"}`,
                `${stats.contributors} contributor${stats.contributors === 1 ? "" : "s"}`,
                history?.summary,
                `commit ${stats.commitSha}${stats.lockedToDeadline ? " (last before the deadline)" : ""}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p className="text-[11px] font-mono text-gray-600">Facts only. Judges give every score.</p>
        </div>
      )}
    </section>
  );
}
