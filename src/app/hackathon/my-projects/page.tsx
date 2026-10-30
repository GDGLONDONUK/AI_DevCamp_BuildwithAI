"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, ExternalLink, Pencil, Save, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isHackathonEligible } from "@/lib/hackathon/access";
import {
  HACKATHON_EVENT,
  hackathonSubmissionStatusMessage,
  hackathonSubmissionsOpen,
} from "@/lib/hackathon";
import { HACKATHON_TECH_TAGS } from "@/lib/hackathonContent";
import {
  fetchMyHackathonProject,
  joinHackathon,
  saveMyHackathonProject,
} from "@/lib/hackathonApi";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/** Statuses that mean the team has shipped (admins may move it on to reviewed/shortlisted/…). */
const SHIPPED_STATUSES = new Set(["submitted", "reviewed", "shortlisted", "winner", "passed"]);

function formatLondon(iso: string, withDay = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(withDay && { weekday: "long", day: "numeric", month: "long" }),
  });
}

export default function MyHackathonProjectPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dateClosedMsg = hackathonSubmissionStatusMessage();
  const [open, setOpen] = useState(() => hackathonSubmissionsOpen());
  const closedMsg = open ? null : dateClosedMsg || "Submissions are closed.";

  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"solo" | "team">("solo");
  const [openToMembers, setOpenToMembers] = useState(false);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [shippedAt, setShippedAt] = useState<string | null>(null);
  /** Shipped teams see a confirmation; "Edit submission" switches back to the form. */
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const eligible = userProfile
    ? isHackathonEligible({
        cohortIds: userProfile.cohortIds,
        hackathonParticipant: userProfile.hackathonParticipant,
        role: userProfile.role,
      })
    : false;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/?login=1&redirect=%2Fhackathon%2Fmy-projects");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !eligible) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMyHackathonProject()
      .then((r) => {
        if (cancelled) return;
        if (typeof r.submissionsOpen === "boolean") setOpen(r.submissionsOpen);
        if (!r.project) return;
        const p = r.project;
        setTitle(p.title);
        setTeamName(p.teamName || "");
        setDescription(p.description);
        setProjectType(p.projectType);
        setOpenToMembers(p.openToMembers);
        setTechStack(p.techStack || []);
        setGithubUrl(p.githubUrl || "");
        setDemoUrl(p.demoUrl || "");
        setStatus(p.status);
        setShippedAt(p.shippedAt ?? null);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, eligible, reloadKey]);

  const toggleTag = (tag: string) => {
    setTechStack((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const save = async (ship: boolean) => {
    if (!open) {
      toast.error(closedMsg || "Submissions closed");
      return;
    }
    setSaving(true);
    try {
      const res = await saveMyHackathonProject({
        ship,
        title,
        teamName,
        description,
        projectType,
        openToMembers,
        techStack,
        githubUrl,
        demoUrl,
      });
      setStatus(res.status);
      if (ship) {
        setShippedAt(new Date().toISOString());
        setEditing(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      toast.success(ship ? "Final submission shipped" : "Progress saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onJoin = async () => {
    try {
      const res = await joinHackathon();
      toast.success(res.message);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Join failed");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-gray-500 font-mono text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  if (!eligible) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <h1 className="text-2xl font-bold text-white">Join the hackathon</h1>
        <p className="text-gray-300 text-sm leading-relaxed">
          DevCamp cohort members are automatically eligible — their final project is the hackathon
          entry. If you are not on the active cohort, register on this site and join the Agentic
          Hackathon here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onJoin}>Join Agentic Hackathon</Button>
          <Link href="/register" className="text-sm text-green-400 underline self-center">
            Need an account? Register
          </Link>
        </div>
      </div>
    );
  }

  const shipped = status !== null && SHIPPED_STATUSES.has(status);
  const closesLabel = formatLondon(HACKATHON_EVENT.submissionClosesIso);

  if (shipped && !editing) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <h1 className="hh-title mb-3" style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)" }}>
          Project submission
        </h1>

        <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={28} className="text-green-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">Your project is submitted</h2>
              <p className="text-sm text-green-100/80 mt-1">
                {shippedAt ? `Shipped ${formatLondon(shippedAt)}. ` : ""}
                Judges will see this version.
                {open && closesLabel ? ` You can update it until ${closesLabel}.` : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500">Project</p>
            <p className="text-lg font-semibold text-white mt-1 break-words">{title}</p>
            <p className="text-sm text-gray-400">
              {teamName || title} · {projectType === "team" ? "Team" : "Solo"}
            </p>
          </div>

          {description && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">{description}</p>
          )}

          <dl className="grid sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">GitHub</dt>
            <dd className="min-w-0">
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 break-all"
                >
                  {githubUrl.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink size={13} className="shrink-0" />
                </a>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </dd>
            <dt className="text-gray-500">Demo video</dt>
            <dd className="min-w-0">
              {demoUrl ? (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 break-all"
                >
                  {demoUrl.replace(/^https?:\/\/(www\.)?/, "")} <ExternalLink size={13} className="shrink-0" />
                </a>
              ) : (
                <span className="text-gray-500">None added (optional)</span>
              )}
            </dd>
            {techStack.length > 0 && (
              <>
                <dt className="text-gray-500">Built with</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {techStack.map((t) => (
                    <span key={t} className="rounded-md px-2 py-0.5 text-xs border border-white/15 text-gray-300">
                      {t}
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {open ? (
            <Button variant="outline" onClick={() => setEditing(true)} className="inline-flex items-center gap-2">
              <Pencil size={16} />
              Edit submission
            </Button>
          ) : (
            <p className="text-sm text-gray-400">{closedMsg || "Submissions are closed."}</p>
          )}
          <Link href="/hackathon/ideas" className="text-sm text-green-400 underline">
            See all projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <h1 className="hh-title mb-3" style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)" }}>
          Project submission
        </h1>
        <p className="text-gray-400 text-sm">
          GDG London · Agentic Hackathon. Use <strong className="text-white">Save progress</strong>{" "}
          while you iterate. Demo video is optional; <strong className="text-white">GitHub</strong>{" "}
          is required when you ship your final submission.
        </p>
        {shipped ? (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            You&apos;re editing a submitted project. Ship again to update what judges see.{" "}
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setReloadKey((k) => k + 1);
              }}
              className="underline text-amber-200 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          status === "draft" && (
            <p className="mt-2 text-xs font-mono text-gray-400">Draft saved: not submitted yet.</p>
          )
        )}
      </div>

      {closedMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-100 text-sm">
          {closedMsg}
        </div>
      )}

      <fieldset disabled={!open || saving} className="space-y-5 disabled:opacity-60">
        <Input
          label="Project title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          label="Team name *"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />

        <div>
          <p className="text-sm text-gray-300 mb-2">Project type *</p>
          <div className="flex gap-3">
            {(["solo", "team"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProjectType(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium border ${
                  projectType === t
                    ? "border-green-500/50 bg-green-500/20 text-green-200"
                    : "border-white/15 text-gray-400"
                }`}
              >
                {t === "solo" ? "Solo" : "Team (max 4)"}
              </button>
            ))}
          </div>
        </div>

        {projectType === "team" && (
          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={openToMembers}
              onChange={(e) => setOpenToMembers(e.target.checked)}
              className="mt-1"
            />
            <span>
              Open to new team members
              <span className="block text-xs text-gray-500">
                Your project will be visible in the idea gallery for others to join.
              </span>
            </span>
          </label>
        )}

        <Input
          label="Demo video URL (optional, max 3 min)"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          placeholder="https://youtube.com/…"
        />

        <div>
          <p className="text-sm text-gray-300 mb-2">Built with (optional)</p>
          <div className="flex flex-wrap gap-2">
            {HACKATHON_TECH_TAGS.map((tag) => {
              const on = techStack.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-md px-2.5 py-1 text-xs border ${
                    on
                      ? "border-green-500/50 bg-green-500/20 text-green-200"
                      : "border-white/15 text-gray-400"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="GitHub repository URL * (required to ship)"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/…"
        />

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">App purpose *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/50"
            placeholder="What problem does it solve? How does the agent work?"
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3 justify-between pt-2">
        <Button
          variant="outline"
          disabled={!open || saving}
          onClick={() => save(false)}
          className="inline-flex items-center gap-2"
        >
          <Save size={16} />
          Save progress
        </Button>
        <Button
          disabled={!open || saving}
          onClick={() => save(true)}
          className="inline-flex items-center gap-2"
        >
          <Send size={16} />
          {!open ? "Submissions closed" : shipped ? "Ship updated submission" : "Ship final submission"}
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Also listed under{" "}
        <Link href="/hackathon/ideas" className="text-green-400 underline">
          Ideas
        </Link>{" "}
        and counted for audience voting on the day (
        <Link href="/vote" className="text-green-400 underline">
          /vote
        </Link>
        ). Admins review all projects in Admin → Projects.
      </p>
    </div>
  );
}
