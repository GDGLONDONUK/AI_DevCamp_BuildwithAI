"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Trophy,
  Vote,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";

type AdminHackathonProject = {
  id: string;
  title: string;
  teamName: string;
  description: string;
  projectType: string;
  openToMembers: boolean;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  userName: string;
  userId?: string;
  userEmail?: string | null;
  voteTotal: number;
  status: string;
  organiser?: boolean;
  prizeEligible?: boolean;
  cohortId?: string;
  hackathonId?: string;
  weekCompleted?: number | null;
};

export default function AdminHackathonPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<AdminHackathonProject[]>([]);
  const [votingOpen, setVotingOpen] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const [winnersAnnounced, setWinnersAnnounced] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "moderator";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/hackathon", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const data = json.data ?? json;
      setProjects(data.projects || []);
      setVotingOpen(Boolean(data.settings?.votingOpen));
      setSubmissionsOpen(data.settings?.submissionsOpen !== false);
      setWinnersAnnounced(Boolean(data.settings?.winnersAnnounced));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/?login=1&redirect=%2Fadmin%2Fhackathon");
      return;
    }
    if (userProfile && !isAdmin) {
      router.push("/");
      return;
    }
    if (isAdmin) void load();
  }, [authLoading, user, userProfile, isAdmin, router, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q) ||
        (p.userEmail || "").toLowerCase().includes(q)
      );
    });
  }, [projects, statusFilter, query]);

  const patchSettings = async (body: {
    votingOpen?: boolean;
    submissionsOpen?: boolean;
  }) => {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/hackathon", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      if (body.votingOpen !== undefined) {
        setVotingOpen(body.votingOpen);
        toast.success(body.votingOpen ? "Voting is now open" : "Voting closed");
      }
      if (body.submissionsOpen !== undefined) {
        setSubmissionsOpen(body.submissionsOpen);
        toast.success(
          body.submissionsOpen ? "Project submissions are open" : "Submissions closed"
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const patchProjectStatus = async (projectId: string, status: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Status update failed");
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status } : p))
      );
      toast.success(`Status → ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    }
  };

  if (authLoading || (!isAdmin && user)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white font-mono mb-2"
            >
              <ArrowLeft size={14} /> Admin
            </Link>
            <h1 className="text-2xl font-extrabold text-white font-mono flex items-center gap-2">
              <Trophy className="text-amber-400" /> Hackathon projects
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">
              Same <code className="text-green-400">projects</code> collection as DevCamp finals —
              tagged for this closing event.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-2 text-sm font-semibold"
            >
              <Vote size={14} /> Open vote screen
              <ExternalLink size={12} />
            </Link>
            <Link
              href="/hackathon/ideas"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 text-gray-300 px-4 py-2 text-sm"
            >
              Ideas gallery
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gray-900/50 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-mono">
              Project submissions
            </p>
            <p className="text-lg text-white font-semibold">
              {submissionsOpen ? (
                <span className="text-green-400">Open</span>
              ) : (
                <span className="text-amber-300">Closed</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Attendees submit on /hackathon/my-projects (same as Submit → Final Project).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={saving || submissionsOpen}
              onClick={() => void patchSettings({ submissionsOpen: true })}
            >
              Open submissions
            </Button>
            <Button
              variant="outline"
              disabled={saving || !submissionsOpen}
              onClick={() => void patchSettings({ submissionsOpen: false })}
            >
              Close submissions
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gray-900/50 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-mono">Audience voting</p>
            <p className="text-lg text-white font-semibold">
              {votingOpen ? (
                <span className="text-green-400">Open</span>
              ) : (
                <span className="text-amber-300">Closed</span>
              )}
              {winnersAnnounced ? " · winners announced" : ""}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Attendees use /vote. Open this on event day so ballots can be cast.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={saving || votingOpen}
              onClick={() => void patchSettings({ votingOpen: true })}
            >
              Open voting
            </Button>
            <Button
              variant="outline"
              disabled={saving || !votingOpen}
              onClick={() => void patchSettings({ votingOpen: false })}
            >
              Close voting
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, team, name, email…"
            className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white font-mono"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white font-mono"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="winner">Winner</option>
          </select>
          <span className="text-xs text-gray-500 font-mono">
            {filtered.length} / {projects.length}
          </span>
        </div>

        {loading && (
          <p className="text-gray-500 font-mono text-sm py-8 text-center">Loading projects…</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 font-mono text-sm py-8 text-center">
            No hackathon / cohort projects yet. Attendees save under{" "}
            <Link href="/hackathon/my-projects" className="text-green-400 underline">
              My project
            </Link>
            .
          </p>
        )}

        <div className="space-y-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-white/10 bg-gray-900/40 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-white font-semibold text-lg">{p.title}</h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {p.teamName} · {p.userName}
                    {p.userEmail ? ` · ${p.userEmail}` : ""} · {p.projectType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase items-center">
                  <select
                    value={p.status}
                    onChange={(e) => void patchProjectStatus(p.id, e.target.value)}
                    className="rounded border border-white/15 bg-gray-950 px-2 py-0.5 text-gray-300"
                  >
                    <option value="draft">draft</option>
                    <option value="submitted">submitted</option>
                    <option value="reviewed">reviewed</option>
                    <option value="shortlisted">shortlisted</option>
                    <option value="winner">winner</option>
                    <option value="passed">passed</option>
                  </select>
                  {p.hackathonId && (
                    <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                      Hackathon
                    </span>
                  )}
                  {p.organiser && (
                    <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                      Organiser · not prize-eligible
                    </span>
                  )}
                  <span className="rounded border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-green-300">
                    {p.voteTotal} votes
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{p.description}</p>
              {p.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.techStack.map((t) => (
                    <span
                      key={t}
                      className="text-xs rounded-full border border-white/10 px-2 py-0.5 text-gray-400"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono"
                  >
                    GitHub →
                  </a>
                )}
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-mono"
                  >
                    Demo →
                  </a>
                )}
                <Link
                  href="/admin"
                  className="text-green-400 hover:underline font-mono"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("adminOpenProjectId", p.id);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Open in Admin → Projects
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
