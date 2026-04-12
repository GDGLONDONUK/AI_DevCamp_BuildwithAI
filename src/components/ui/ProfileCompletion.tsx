"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { UserProfile } from "@/types";

// ── Field definitions ────────────────────────────────────────────────────────

interface Field {
  key: string;
  label: string;
  hint: string;
  check: (p: UserProfile) => boolean;
  section?: string; // anchor on the profile page
}

const FIELDS: Field[] = [
  {
    key: "displayName",
    label: "Full name",
    hint: "Add your name so others know who you are",
    check: (p) => Boolean(p.displayName?.trim()),
    section: "displayName",
  },
  {
    key: "bio",
    label: "Bio",
    hint: "Tell the community about your background and goals",
    check: (p) => Boolean(p.bio && p.bio.trim().length >= 20),
    section: "bio",
  },
  {
    key: "location",
    label: "Location",
    hint: "Add your city and country",
    check: (p) => Boolean(p.city || p.country),
    section: "location",
  },
  {
    key: "experienceLevel",
    label: "Experience level",
    hint: "Let us know your AI experience level",
    check: (p) => Boolean(p.experienceLevel),
    section: "experience",
  },
  {
    key: "skills",
    label: "Programming skills",
    hint: "Add at least one skill you know",
    check: (p) => Array.isArray(p.skills) && p.skills.length > 0,
    section: "skills",
  },
  {
    key: "expertise",
    label: "Domain expertise",
    hint: "Share your domain knowledge area",
    check: (p) => Array.isArray(p.expertise) && p.expertise.length > 0,
    section: "skills",
  },
  {
    key: "wantToLearn",
    label: "Learning goals",
    hint: "What do you want to learn at AI DevCamp?",
    check: (p) => Array.isArray(p.wantToLearn) && p.wantToLearn.length > 0,
    section: "learning",
  },
  {
    key: "canOffer",
    label: "What you can offer",
    hint: "How can you help other attendees?",
    check: (p) => Array.isArray(p.canOffer) && p.canOffer.length > 0,
    section: "learning",
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn",
    hint: "Connect professionally with other attendees",
    check: (p) => Boolean(p.linkedinUrl?.trim()),
    section: "links",
  },
  {
    key: "githubUrl",
    label: "GitHub",
    hint: "Show your code to the community",
    check: (p) => Boolean(p.githubUrl?.trim()),
    section: "links",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcCompletion(profile: UserProfile) {
  const done = FIELDS.filter((f) => f.check(profile));
  const pct  = Math.round((done.length / FIELDS.length) * 100);
  const missing = FIELDS.filter((f) => !f.check(profile));
  return { pct, done: done.length, total: FIELDS.length, missing };
}

function colorClass(pct: number) {
  if (pct === 100) return { bar: "bg-green-500",  text: "text-green-400",  ring: "border-green-500/40" };
  if (pct >= 70)  return { bar: "bg-blue-500",    text: "text-blue-400",   ring: "border-blue-500/40" };
  if (pct >= 40)  return { bar: "bg-yellow-500",  text: "text-yellow-400", ring: "border-yellow-500/40" };
  return               { bar: "bg-orange-500",   text: "text-orange-400", ring: "border-orange-500/40" };
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile | null;
  /** "full" shows missing items list; "compact" shows just the bar (for dashboard) */
  variant?: "full" | "compact";
}

export default function ProfileCompletion({ profile, variant = "full" }: Props) {
  if (!profile) return null;

  const { pct, done, total, missing } = calcCompletion(profile);
  const { bar, text, ring } = colorClass(pct);

  if (variant === "compact") {
    return (
      <div className={`bg-gray-900/60 border ${ring} rounded-2xl p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">Profile Completion</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {done}/{total} sections complete
            </p>
          </div>
          <span className={`text-2xl font-extrabold font-mono ${text}`}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/8 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full ${bar} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {pct < 100 ? (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Missing: {missing.slice(0, 3).map((f) => f.label).join(", ")}
              {missing.length > 3 && ` +${missing.length - 3} more`}
            </p>
            <Link
              href="/profile"
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${text} hover:opacity-80 transition-opacity font-mono`}
            >
              Complete your profile <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <p className="text-sm text-green-400 font-semibold font-mono">
            ✓ Profile fully complete — great work!
          </p>
        )}
      </div>
    );
  }

  // ── Full variant (used on /profile page) ─────────────────────────────────
  return (
    <div className={`border ${ring} rounded-2xl overflow-hidden mb-8`}>
      {/* Header */}
      <div className="bg-gray-900/80 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">
              Profile completion
            </span>
            <span className={`text-sm font-extrabold font-mono ${text}`}>
              {pct}% — {done}/{total}
            </span>
          </div>
          <div className="h-3 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full ${bar} rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Field checklist */}
      <div className="bg-gray-900/40 px-6 py-4">
        {pct === 100 ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
            <CheckCircle2 size={18} />
            Your profile is fully complete — you&apos;re all set!
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-3">
              Still to fill in
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {FIELDS.map((field) => {
                const isDone = field.check(profile);
                return (
                  <div
                    key={field.key}
                    className={`flex items-start gap-2.5 text-sm rounded-xl px-3 py-2.5 transition-colors ${
                      isDone
                        ? "text-gray-600 line-through decoration-gray-700"
                        : "text-gray-300 bg-white/[0.03] border border-white/8"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={15} className={`${text} flex-shrink-0 mt-0.5 opacity-70`} />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold block">{field.label}</span>
                      {!isDone && (
                        <span className="text-xs text-gray-500 block mt-0.5">{field.hint}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
