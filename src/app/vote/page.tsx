"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Vote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  castVotes,
  fetchVoteState,
  type HackathonIdea,
} from "@/lib/hackathonApi";
import Button from "@/components/ui/Button";

export default function VotePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<HackathonIdea[]>([]);
  const [voteableIds, setVoteableIds] = useState<Set<string>>(new Set());
  const [ownProjectIds, setOwnProjectIds] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [votingOpen, setVotingOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [budget, setBudget] = useState(5);
  const [maxPer, setMaxPer] = useState(2);
  const [query, setQuery] = useState("");

  const used = useMemo(
    () => Object.values(allocations).reduce((s, n) => s + (n || 0), 0),
    [allocations]
  );
  const remaining = budget - used;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const state = await fetchVoteState();
      setProjects(state.projects);
      setVoteableIds(new Set(state.voteableIds || []));
      setOwnProjectIds(new Set(state.ownProjectIds || []));
      setAllocations(state.allocations || {});
      setVotingOpen(state.votingOpen);
      setMessage(state.message);
      setBudget(state.budget);
      setMaxPer(state.maxPerProject);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load votes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/?login=1&redirect=%2Fvote");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const setCount = (projectId: string, next: number) => {
    const clamped = Math.max(0, Math.min(maxPer, next));
    setAllocations((prev) => {
      const draft = { ...prev, [projectId]: clamped };
      const total = Object.values(draft).reduce((s, n) => s + n, 0);
      if (total > budget) {
        toast.error(`Budget is ${budget} votes`);
        return prev;
      }
      if (clamped === 0) {
        const { [projectId]: _, ...rest } = draft;
        return rest;
      }
      return draft;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await castVotes(allocations);
      setAllocations(res.allocations);
      toast.success(`Votes saved · ${res.remaining} remaining`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <p className="font-mono text-xs mb-1 text-[var(--hh-pumpkin-2)]">Audience ballot</p>
          <h1
            className="hh-title flex items-center gap-3 flex-wrap"
            style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)" }}
          >
            <Vote className="text-[var(--hh-pumpkin)] shrink-0" size={36} />
            Vote for projects
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Pick your favourites. Up to <strong className="text-white">{maxPer}</strong> votes per
            project. You cannot vote for your own project. Winners by total audience votes.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Your budget</p>
            <p className="text-2xl font-bold text-white">
              {used} / {budget}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
            <p className="text-2xl font-bold text-green-300">{remaining}</p>
          </div>
          <div className="text-sm text-gray-400">
            Status:{" "}
            {votingOpen ? (
              <span className="text-green-400">Open</span>
            ) : (
              <span className="text-amber-300">{message || "Closed"}</span>
            )}
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
        />

        {loading && <p className="text-gray-500 text-sm font-mono">Loading…</p>}

        <div className="space-y-3">
          {filtered.map((p) => {
            const n = allocations[p.id] || 0;
            const isOwn = ownProjectIds.has(p.id) || (user?.uid != null && p.userId === user.uid);
            const canVote = !isOwn && voteableIds.has(p.id) && p.status !== "draft";
            return (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap gap-4 items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{p.title}</p>
                  <p className="text-xs text-gray-500">
                    {p.teamName} · {p.userName} · {p.voteTotal} votes
                    {isOwn
                      ? " · your project (not voteable)"
                      : p.status === "draft"
                        ? " · draft (not voteable yet)"
                        : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOwn ? (
                    <span className="text-xs font-mono text-amber-300/80">Own entry</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!votingOpen || !canVote || n <= 0}
                        onClick={() => setCount(p.id, n - 1)}
                        className="w-8 h-8 rounded-lg border border-white/20 text-white disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-white font-mono">{n}</span>
                      <button
                        type="button"
                        disabled={!votingOpen || !canVote || n >= maxPer || remaining <= 0}
                        onClick={() => setCount(p.id, n + 1)}
                        className="w-8 h-8 rounded-lg border border-white/20 text-white disabled:opacity-40"
                      >
                        +
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && projects.length === 0 && (
          <p className="text-gray-500 text-sm">
            No submitted projects yet.{" "}
            <Link href="/hackathon/ideas" className="text-green-400 underline">
              Browse ideas
            </Link>
          </p>
        )}

        <div className="flex justify-end">
          <Button disabled={!votingOpen || submitting} onClick={submit}>
            {submitting ? "Saving…" : "Submit votes"}
          </Button>
        </div>
    </div>
  );
}
