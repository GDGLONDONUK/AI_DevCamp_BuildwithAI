"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Users } from "lucide-react";
import { fetchHackathonIdeas, type HackathonIdea } from "@/lib/hackathonApi";

export default function HackathonIdeasPage() {
  const [ideas, setIdeas] = useState<HackathonIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHackathonIdeas(openOnly)
      .then((r) => {
        if (!cancelled) setIdeas(r.ideas);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openOnly]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="hh-title mb-3 flex items-center gap-3 flex-wrap"
            style={{ fontSize: "clamp(2.2rem, 7vw, 3.5rem)" }}
          >
            <Lightbulb className="text-[var(--hh-pumpkin-2)]" size={32} />
            Idea gallery
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Live from the same Firestore <code className="text-green-300">projects</code> collection
            as My project (this cohort + hackathon-tagged entries — drafts and shipped). Looking
            for a team? Filter open ideas and reach out via Discord or the builder named on the
            card.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
            className="rounded border-white/20"
          />
          Open to new members
        </label>
      </div>

      <div className="flex gap-3">
        <Link
          href="/hackathon/my-projects"
          className="rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2"
        >
          Submit / edit my project
        </Link>
      </div>

      {loading && <p className="text-gray-500 font-mono text-sm">Loading ideas…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && ideas.length === 0 && (
        <p className="text-gray-500 text-sm">
          No ideas yet. Be the first —{" "}
          <Link href="/hackathon/my-projects" className="text-green-400 underline">
            create yours
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {ideas.map((idea) => (
          <article
            key={idea.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-white font-semibold text-lg leading-snug">{idea.title}</h2>
              <span className="shrink-0 text-xs font-mono text-gray-500 uppercase">
                {idea.status}
              </span>
            </div>
            <p className="text-gray-500 text-xs">
              {idea.teamName} · {idea.userName} · {idea.projectType}
            </p>
            <p className="text-gray-300 text-sm line-clamp-4">{idea.description}</p>
            {idea.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {idea.techStack.map((t) => (
                  <span
                    key={t}
                    className="text-xs rounded-md border border-green-500/30 bg-green-500/10 text-green-200 px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {idea.openToMembers && (
              <p className="text-xs text-yellow-200/90 flex items-center gap-1 mt-auto pt-2">
                <Users size={12} /> Open to new team members
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
