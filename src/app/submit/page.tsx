"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getActiveCohortSessions, CURRICULUM_WEEKS } from "@/data/sessions";
import { useSessions } from "@/hooks/useSessions";
import { BookOpen, Code2, Link2, FileText, Globe, Trophy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { HACKATHON_EVENT } from "@/lib/hackathon";

const STATIC_SESSIONS = getActiveCohortSessions();

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { trackActivity } from "@/lib/activityApi";

type SubmitType = "assignment" | "project";

export default function SubmitPage() {
  const { user, userProfile, loading } = useAuth();
  const { sessions: liveSessions } = useSessions();
  const programmeSessions = useMemo(
    () => (liveSessions.length > 0 ? liveSessions : STATIC_SESSIONS),
    [liveSessions]
  );
  const router = useRouter();
  const [submitType, setSubmitType] = useState<SubmitType>("assignment");
  const [submitting, setSubmitting] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    weekNumber: 1,
    sessionId: "",
    title: "",
    description: "",
    githubUrl: "",
    notebookUrl: "",
    demoUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push("/?login=1&redirect=%2Fsubmit");
    }
  }, [user, loading, router]);

  const validateAssignment = () => {
    const e: Record<string, string> = {};
    if (!assignmentForm.title.trim()) e.title = "Title is required";
    if (!assignmentForm.description.trim())
      e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAssignment()) return;
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "assignments"), {
        userId: user!.uid,
        userName: userProfile?.displayName || user!.email,
        weekNumber: assignmentForm.weekNumber,
        sessionId: assignmentForm.sessionId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        githubUrl: assignmentForm.githubUrl,
        notebookUrl: assignmentForm.notebookUrl,
        demoUrl: assignmentForm.demoUrl,
        status: "submitted",
        submittedAt: serverTimestamp(),
        submittedAtClient: new Date().toISOString(),
      });
      trackActivity({
        type: "assignment_submitted",
        assignmentId: docRef.id,
        sessionId: assignmentForm.sessionId || undefined,
        sessionTitle: assignmentForm.title,
      });
      toast.success("Assignment submitted successfully! 🎉");
      setAssignmentForm({
        weekNumber: 1,
        sessionId: "",
        title: "",
        description: "",
        githubUrl: "",
        notebookUrl: "",
        demoUrl: "",
      });
      setErrors({});
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Submit Your Work</h1>
          <p className="text-gray-400">
            Share your weekly assignments or final projects with mentors.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.07] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Trophy className="text-yellow-400 shrink-0 mt-0.5" size={22} />
            <div className="min-w-0">
              <h2 className="text-white font-semibold mb-1">
                Cohort closing — {HACKATHON_EVENT.shortTitle}
              </h2>
              <p className="text-gray-300 text-sm mb-3">
                {HACKATHON_EVENT.dateLabel} · {HACKATHON_EVENT.timeLabel} ·{" "}
                {HACKATHON_EVENT.modeLabel}. Your <strong className="text-white">final project</strong>{" "}
                is the same database record as your hackathon entry — edit it once under My project.
                Register for the day on Luma (in person or online).
              </p>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <Link
                  href="/hackathon/my-projects"
                  className="text-yellow-300 hover:text-yellow-200"
                >
                  Open my project (hackathon) →
                </Link>
                <Link href="/hackathon" className="text-yellow-300/80 hover:text-yellow-200">
                  Hackathon details →
                </Link>
                <a
                  href={HACKATHON_EVENT.lumaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                >
                  Luma registration
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="flex bg-gray-900 border border-white/10 rounded-xl p-1 mb-8">
          <button
            onClick={() => {
              setSubmitType("assignment");
              setErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              submitType === "assignment"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BookOpen size={16} />
            Weekly Assignment
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmitType("project");
              setErrors({});
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              submitType === "project"
                ? "bg-green-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Code2 size={16} />
            Final Project
          </button>
        </div>

        {submitType === "assignment" ? (
          <form
            onSubmit={handleSubmitAssignment}
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Week Number
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CURRICULUM_WEEKS.map((w) => (
                  <button
                    key={w.week}
                    type="button"
                    onClick={() =>
                      setAssignmentForm({
                        ...assignmentForm,
                        weekNumber: w.week,
                      })
                    }
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                      assignmentForm.weekNumber === w.week
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    Week {w.week}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Related Session{" "}
                <span className="text-gray-500">(optional)</span>
              </label>
              <select
                value={assignmentForm.sessionId}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    sessionId: e.target.value,
                  })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">— Select session —</option>
                {programmeSessions.filter(
                  (s) => s.week === assignmentForm.weekNumber
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    Session {s.number}: {s.title}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="asn-title"
              label="Assignment Title *"
              placeholder="e.g. Calculator App in Python"
              icon={<FileText size={16} />}
              value={assignmentForm.title}
              onChange={(e) =>
                setAssignmentForm({ ...assignmentForm, title: e.target.value })
              }
              error={errors.title}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Description *
              </label>
              <textarea
                rows={4}
                placeholder="Describe what you built and what you learned..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                value={assignmentForm.description}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    description: e.target.value,
                  })
                }
              />
              {errors.description && (
                <p className="text-xs text-red-400 mt-1">{errors.description}</p>
              )}
            </div>

            <Input
              id="asn-github"
              label="GitHub Repository"
              placeholder="https://github.com/yourname/repo"
              icon={<GithubIcon />}
              value={assignmentForm.githubUrl}
              onChange={(e) =>
                setAssignmentForm({
                  ...assignmentForm,
                  githubUrl: e.target.value,
                })
              }
            />

            <Input
              id="asn-notebook"
              label="Google Colab / Notebook URL"
              placeholder="https://colab.research.google.com/..."
              icon={<Link2 size={16} />}
              value={assignmentForm.notebookUrl}
              onChange={(e) =>
                setAssignmentForm({
                  ...assignmentForm,
                  notebookUrl: e.target.value,
                })
              }
            />

            <Input
              id="asn-demo"
              label="Demo URL"
              placeholder="https://your-demo.com"
              icon={<Globe size={16} />}
              value={assignmentForm.demoUrl}
              onChange={(e) =>
                setAssignmentForm({ ...assignmentForm, demoUrl: e.target.value })
              }
            />

            <Button
              type="submit"
              loading={submitting}
              className="w-full !bg-purple-600 hover:!bg-purple-700 focus:!ring-purple-500"
              size="lg"
            >
              Submit Assignment
            </Button>
          </form>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-semibold text-white">One project record</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              For this cohort, your final project and hackathon submission are the{" "}
              <strong className="text-white">same</strong> Firestore{" "}
              <code className="text-green-300">projects</code> document. Edit and ship it on
              the hackathon My project page so ideas, voting, and admin review stay in sync.
            </p>
            <Link
              href="/hackathon/my-projects"
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-3"
            >
              <Code2 size={16} />
              Continue to My project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
