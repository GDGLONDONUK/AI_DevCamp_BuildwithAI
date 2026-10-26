"use client";

import Link from "next/link";
import {
  DEFAULT_RULES_SECTIONS,
  JUDGING_CRITERIA,
  type RulesSection,
} from "@/lib/hackathonContent";

function SectionCard({ section }: { section: RulesSection }) {
  const border =
    section.variant === "amber"
      ? "border-amber-500/40 bg-amber-500/10"
      : section.variant === "violet"
        ? "border-green-500/30 bg-green-500/[0.06]"
        : section.variant === "emerald"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : section.kind === "warning"
            ? "border-red-500/30 bg-red-500/10"
            : "border-white/10 bg-white/[0.03]";

  return (
    <article className={`rounded-xl border p-5 ${border}`}>
      <h2 className="text-lg font-semibold text-white mb-2">{section.title}</h2>
      {section.body && (
        <p className="text-gray-300 text-sm whitespace-pre-line mb-2">{section.body}</p>
      )}
      {section.items && section.kind === "numbered" && (
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )}
      {section.items && section.kind !== "numbered" && (
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {section.kind === "judging" && (
        <ul className="mt-2 space-y-2">
          {JUDGING_CRITERIA.map((c) => (
            <li key={c.title} className="text-sm">
              <span className="text-green-300 font-semibold">{c.title}: </span>
              <span className="text-gray-300">{c.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {section.linkHref && (
        <a
          href={section.linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-sm text-green-400 underline"
        >
          {section.linkLabel || section.linkHref}
        </a>
      )}
    </article>
  );
}

export default function HackathonRulesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <h1 className="hh-title mb-3" style={{ fontSize: "clamp(2.2rem, 7vw, 3.5rem)" }}>
          Rules
        </h1>
        <p className="text-gray-400 text-sm">
          DevCamp attendees: your final project is your hackathon entry. Everyone else:{" "}
          <Link href="/register" className="text-green-400 underline">
            register
          </Link>
          , then join the hackathon from{" "}
          <Link href="/hackathon/my-projects" className="text-green-400 underline">
            My project
          </Link>
          .
        </p>
      </div>
      {DEFAULT_RULES_SECTIONS.map((s) => (
        <SectionCard key={s.id} section={s} />
      ))}
    </div>
  );
}
