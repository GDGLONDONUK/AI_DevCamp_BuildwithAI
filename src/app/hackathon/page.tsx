"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Monitor,
  ExternalLink,
  Laptop,
  Upload,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { HACKATHON_EVENT } from "@/lib/hackathon";

export default function HackathonPage() {
  const { user } = useAuth();
  const e = HACKATHON_EVENT;

  return (
    <div className="min-h-screen bg-gray-950">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(234,179,8,0.12), transparent 50%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p className="font-mono text-sm text-green-400/80 tracking-widest mb-3">
            <span className="text-green-500/40">{"// "}</span>COHORT CLOSING
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            {e.shortTitle}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mb-6">
            Official cohort finish: Agentic Hackathon with Google ADK — show and tell, pitch,
            then the closing certificate and award ceremony. Hosted by GDG London. In person in
            London and online.
          </p>
          <div className="flex flex-wrap gap-3 font-mono text-sm text-gray-300 mb-8">
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <Calendar size={16} className="text-green-400" />
              {e.dateLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <Clock size={16} className="text-green-400" />
              {e.timeLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <MapPin size={16} className="text-green-400" />
              {e.venueName}, London
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-200">
              <Monitor size={16} />
              {e.modeLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={e.lumaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-3 transition-colors"
            >
              Register on Luma
              <ExternalLink size={16} />
            </a>
            {user ? (
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:border-green-500/50 bg-white/[0.04] hover:bg-green-500/10 text-white font-semibold px-5 py-3 transition-colors"
              >
                <Upload size={16} className="text-green-400" />
                Submit final project
              </Link>
            ) : (
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:border-green-500/50 bg-white/[0.04] text-white font-semibold px-5 py-3 transition-colors"
              >
                View programme sessions
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Trophy size={22} className="text-yellow-400" />
            Closing for this cohort
          </h2>
          <p className="text-gray-300 leading-relaxed">
            Saturday 31 October 2026 is the official end of the September 2026 AI DevCamp cohort:
            hands-on building with Google ADK, expert sessions, project showcases and pitching,
            then the closing certificate and award ceremony. Take part solo or in a team. Register
            on{" "}
            <a
              href={e.lumaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 underline"
            >
              Luma
            </a>
            ; rules and submission criteria are shared by email — also submit your final project
            on this site so mentors can review it.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Schedule</h2>
          <ol className="space-y-3">
            {e.schedule.map((slot) => (
              <li
                key={slot.time}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
              >
                <p className="font-mono text-sm text-green-400 mb-1">{slot.time}</p>
                <p className="text-white font-semibold">{slot.title}</p>
                <p className="text-gray-400 text-sm mt-1">{slot.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <MapPin size={18} className="text-green-400" />
              Venue
            </h3>
            <p className="text-gray-300 text-sm">
              {e.venueName}
              <br />
              {e.venueAddress}
            </p>
            <p className="text-gray-500 text-xs font-mono mt-3">Online attendance also available via Luma.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Laptop size={18} className="text-green-400" />
              What to bring
            </h3>
            <ul className="text-gray-300 text-sm space-y-1.5 list-disc list-inside">
              <li>Laptop and charger</li>
              <li>Your agent idea (or team brief)</li>
              <li>Energy for a full day of building</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-green-500/30 bg-green-500/[0.06] p-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Users size={20} className="text-green-400" />
            Register and submit
          </h2>
          <p className="text-gray-300 text-sm mb-4">
            Use Luma for the event ticket (in person or online). Use{" "}
            <strong className="text-white font-semibold">Submit → Final Project</strong> on this
            portal for the cohort closing submission mentors review.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={e.lumaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-300 hover:text-green-200"
            >
              {e.lumaUrl.replace("https://", "")}
              <ExternalLink size={14} />
            </a>
            {user && (
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-300 hover:text-yellow-200"
              >
                Open submit form
                <Upload size={14} />
              </Link>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm font-mono">
          Presented by GDG London · Build. Collaborate. Innovate.
        </p>
      </section>
    </div>
  );
}
