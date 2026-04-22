"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Project } from "@/types";
import { formatAdminDateTime } from "@/lib/admin/format";

const STATUS_OPTIONS: { value: Project["status"]; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "winner", label: "Winner" },
  { value: "passed", label: "Passed" },
];

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
  onSave: (id: string, data: { status: Project["status"]; feedback: string }) => Promise<void>;
}

export default function ProjectDetailModal({ project, onClose, onSave }: ProjectDetailModalProps) {
  const [status, setStatus] = useState<Project["status"]>(project.status);
  const [feedback, setFeedback] = useState(project.feedback ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setStatus(project.status);
    setFeedback(project.feedback ?? "");
  }, [project]);

  const submit = async () => {
    if (!project.id) return;
    setSaving(true);
    try {
      await onSave(project.id, { status, feedback: feedback.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-detail-title"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/8">
          <div className="min-w-0">
            <h2 id="project-detail-title" className="text-xl font-bold text-white font-mono truncate">
              {project.title}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {project.userName} · <span className="text-green-400/90 font-mono">{project.userEmail}</span>
            </p>
            <p className="text-xs text-gray-600 font-mono mt-1">
              Submitted {formatAdminDateTime(project.submittedAt)} · Week {project.weekCompleted}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="text-gray-500 hover:text-white p-1 rounded-lg shrink-0"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Description</span>
            <p className="text-sm text-gray-300 whitespace-pre-wrap mt-1 leading-relaxed">{project.description}</p>
          </div>

          {project.techStack && project.techStack.length > 0 && (
            <div>
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Tech stack</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {project.techStack.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-white/8 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-mono"
              >
                <ExternalLink size={14} /> GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-mono"
              >
                <ExternalLink size={14} /> Demo
              </a>
            )}
          </div>

          {project.screenshotUrls && project.screenshotUrls.length > 0 && (
            <div>
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Screenshots</span>
              <ul className="mt-1 space-y-1">
                {project.screenshotUrls.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline font-mono truncate block"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-1 gap-4 pt-2 border-t border-white/8">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project["status"])}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Admin feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                placeholder="Notes for the participant…"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-white/8 bg-gray-950/50">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white font-mono"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-gray-950 font-mono text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save status & feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
