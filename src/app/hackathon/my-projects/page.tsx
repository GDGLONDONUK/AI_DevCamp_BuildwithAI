"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isHackathonEligible } from "@/lib/hackathon/access";
import {
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

export default function MyHackathonProjectPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const closedMsg = hackathonSubmissionStatusMessage();
  const open = hackathonSubmissionsOpen();

  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"solo" | "team">("solo");
  const [openToMembers, setOpenToMembers] = useState(false);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const eligible = userProfile
    ? isHackathonEligible({
        cohortIds: userProfile.cohortIds,
        hackathonParticipant: userProfile.hackathonParticipant,
        role: userProfile.role,
      })
    : false;

  useEffect(() => {
    if (!authLoading && !user) router.push("/?login=1");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !eligible) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMyHackathonProject()
      .then((r) => {
        if (cancelled || !r.project) return;
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
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, eligible]);

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
        {status && (
          <p className="mt-2 text-xs font-mono text-green-400/80">Status: {status}</p>
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
          {open ? "Ship final submission" : "Submissions closed"}
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
