"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSessions } from "@/hooks/useSessions";
import {
  Calendar, Clock, ExternalLink, MapPin,
  ChevronDown, Lightbulb, BookOpen, Mic, Timer,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { Session } from "@/types";

function groupByWeek(sessions: Session[]): Record<number, Session[]> {
  return sessions.reduce((acc, s) => {
    if (!acc[s.week]) acc[s.week] = [];
    acc[s.week].push(s);
    return acc;
  }, {} as Record<number, Session[]>);
}

const WEEK_LABELS: Record<number, string> = {
  1: "Python for AI",
  2: "Machine Learning",
  3: "Neural Networks",
  4: "Real Projects",
};

export default function SessionsPage() {
  const { user, userProfile } = useAuth();
  const { sessions, loading } = useSessions();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState(false);

  const isApproved =
    user &&
    ["participated", "certified"].includes(userProfile?.userStatus ?? "");

  const grouped = groupByWeek(sessions);
  const weekNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-sm text-green-400/70 tracking-widest mb-4">
            <span className="text-green-500/40">// </span>PROGRAMME 2026
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-5 leading-tight">
            Session Schedule
          </h1>
          <p className="text-gray-300 text-lg font-mono mb-4">
            <span className="text-green-400">{sessions.length || 6}</span> sessions ·{" "}
            <span className="text-green-400">4</span> weeks · Thu &amp; Sat evenings
          </p>
          <div className="flex items-center justify-center gap-2 text-base text-gray-400 font-mono">
            <MapPin size={16} className="text-green-400" />
            Skyscanner HQ · London · W1D 4AL
          </div>
        </div>

        {/* ── Access banners ── */}
        {!user && (
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-10 text-base text-blue-300">
            <BookOpen size={18} className="flex-shrink-0 mt-0.5" />
            <span>
              Sessions are open to approved DevCamp attendees.{" "}
              <button
                onClick={() => setAuthModal(true)}
                className="font-semibold underline underline-offset-2 hover:text-blue-200"
              >
                Sign in
              </button>{" "}
              to see your access level.
            </span>
          </div>
        )}

        {user && !isApproved && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-10 text-base text-yellow-300">
            <Clock size={18} className="flex-shrink-0 mt-0.5" />
            <span>
              Your application is <strong>pending approval</strong>. Once approved you will get
              full access to all session materials, recordings, and resources.
            </span>
          </div>
        )}

        {/* ── Timeline ── */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <Calendar size={52} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-lg">Sessions will be announced soon.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {weekNums.map((week) => {
              const weekSessions = grouped[week];
              const weekLabel = WEEK_LABELS[week];
              return (
                <div key={week}>

                  {/* ── Week pill header ── */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex-1 h-px bg-white/8" />
                    <div className="flex flex-col items-center">
                      <div className="px-6 py-2.5 rounded-full bg-green-500/15 border border-green-500/30 font-mono text-sm font-bold tracking-widest text-green-300 whitespace-nowrap">
                        WEEK {week}
                      </div>
                      {weekLabel && (
                        <p className="font-mono text-xs text-gray-500 mt-1.5 tracking-wider">
                          // {weekLabel}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* ── Sessions with vertical timeline ── */}
                  <div className="relative">
                    {/* Vertical connector line */}
                    {weekSessions.length > 1 && (
                      <div
                        className="absolute left-7 top-7 w-px bg-gradient-to-b from-green-500/30 via-green-500/15 to-transparent"
                        style={{ height: "calc(100% - 56px)" }}
                      />
                    )}

                    <div className="space-y-5">
                      {weekSessions.map((session) => {
                        const isOpen = expanded === session.id;
                        const isSpecial = session.isKickoff || session.isClosing;

                        return (
                          <div key={session.id} className="flex gap-5">

                            {/* ── Timeline dot ── */}
                            <div className="relative flex-shrink-0 z-10">
                              <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold border-2 transition-all duration-200 ${
                                isSpecial
                                  ? "bg-green-500 border-green-400 text-gray-950 shadow-lg shadow-green-500/40"
                                  : isOpen
                                  ? "bg-green-500/20 border-green-400 text-green-300 shadow-md shadow-green-500/20"
                                  : "bg-gray-900 border-green-500/30 text-gray-400"
                              }`}>
                                <span className="text-[9px] opacity-50 leading-none uppercase tracking-wider">Sess</span>
                                <span className="text-xl leading-none">{session.number}</span>
                              </div>
                            </div>

                            {/* ── Session card ── */}
                            <div className={`flex-1 min-w-0 rounded-2xl border transition-all duration-200 ${
                              isOpen
                                ? "border-green-500/40 bg-green-500/[0.04]"
                                : isSpecial
                                ? "border-green-500/30 bg-green-500/[0.05]"
                                : "border-white/10 bg-white/[0.02] hover:border-green-500/25 hover:bg-green-500/[0.02]"
                            }`}>

                              {/* Card header — always visible */}
                              <button
                                onClick={() => setExpanded(isOpen ? null : session.id)}
                                className="w-full text-left p-5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">

                                    {/* Title row */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3 className="text-xl font-bold text-white">{session.title}</h3>
                                      {session.isKickoff && (
                                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                                          🚀 KICKOFF
                                        </span>
                                      )}
                                      {session.isClosing && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                                          🏆 DEMO DAY
                                        </span>
                                      )}
                                    </div>

                                    {/* Topic */}
                                    {session.topic && (
                                      <p className="text-base font-semibold text-green-400 mb-2.5">
                                        {session.topic}
                                      </p>
                                    )}

                                    {/* Meta row */}
                                    <div className="flex flex-wrap items-center gap-4 font-mono text-sm text-gray-400">
                                      {session.date && (
                                        <span className="flex items-center gap-1.5">
                                          <Calendar size={13} className="text-green-500" />
                                          {session.date}
                                        </span>
                                      )}
                                      {session.time && (
                                        <span className="flex items-center gap-1.5">
                                          <Clock size={13} className="text-green-500" />
                                          {session.time}
                                        </span>
                                      )}
                                      {session.duration && (
                                        <span className="flex items-center gap-1.5">
                                          <Timer size={13} className="text-green-500" />
                                          {session.duration}
                                        </span>
                                      )}
                                    </div>

                                    {/* Tags */}
                                    {session.tags && session.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-3">
                                        {session.tags.map((t) => (
                                          <span key={t} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <ChevronDown
                                    size={20}
                                    className={`text-gray-500 flex-shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-180 text-green-400" : ""}`}
                                  />
                                </div>
                              </button>

                              {/* ── Expanded detail ── */}
                              {isOpen && (
                                <div className="px-5 pb-6 space-y-5 border-t border-white/8 pt-5">

                                  {/* Description */}
                                  {session.description && (
                                    <p className="text-base text-gray-300 leading-relaxed">
                                      {session.description}
                                    </p>
                                  )}

                                  {/* Speaker */}
                                  {session.speaker && (
                                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-4">
                                      {session.speakerPhoto ? (
                                        <img
                                          src={session.speakerPhoto}
                                          alt={session.speaker}
                                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                          {session.speaker[0]}
                                        </div>
                                      )}
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <Mic size={13} className="text-green-400" />
                                          <span className="text-base font-semibold text-white">{session.speaker}</span>
                                        </div>
                                        {session.speakerTitle && (
                                          <p className="text-sm text-gray-500 mt-0.5">{session.speakerTitle}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* What you'll learn + Build ideas */}
                                  {(session.whatYouWillLearn?.length || session.buildIdeas?.length) && (
                                    isApproved ? (
                                      <div className="grid sm:grid-cols-2 gap-5">
                                        {session.whatYouWillLearn && session.whatYouWillLearn.length > 0 && (
                                          <div>
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                              <BookOpen size={14} className="text-blue-400" />
                                              What you&apos;ll learn
                                            </div>
                                            <ul className="space-y-2">
                                              {session.whatYouWillLearn.map((item) => (
                                                <li key={item} className="flex items-start gap-2 text-base text-gray-300">
                                                  <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {session.buildIdeas && session.buildIdeas.length > 0 && (
                                          <div>
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                              <Lightbulb size={14} className="text-purple-400" />
                                              Build ideas
                                            </div>
                                            <ul className="space-y-2">
                                              {session.buildIdeas.map((idea) => (
                                                <li key={idea} className="flex items-start gap-2 text-base text-gray-300">
                                                  <span className="text-purple-400 mt-0.5 flex-shrink-0">💡</span>
                                                  {idea}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-4 text-base text-gray-500">
                                        <BookOpen size={18} className="text-gray-600 flex-shrink-0" />
                                        <span>Full session content is available to approved attendees.</span>
                                      </div>
                                    )
                                  )}

                                  {/* Video + Resources folder */}
                                  {(session.videoUrl || session.resourcesFolderUrl) && (
                                    <div className="flex flex-wrap gap-3">
                                      {session.videoUrl && (
                                        isApproved ? (
                                          <a
                                            href={session.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-red-600/80 hover:bg-red-600 px-5 py-2.5 rounded-xl transition-colors"
                                          >
                                            ▶ Watch Recording
                                          </a>
                                        ) : (
                                          <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white/[0.03] border border-white/8 px-5 py-2.5 rounded-xl cursor-not-allowed">
                                            🔒 Recording for approved attendees
                                          </span>
                                        )
                                      )}
                                      {session.resourcesFolderUrl && (
                                        isApproved ? (
                                          <a
                                            href={session.resourcesFolderUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-sky-600/80 hover:bg-sky-600 px-5 py-2.5 rounded-xl transition-colors"
                                          >
                                            📁 Open Resources Folder
                                          </a>
                                        ) : (
                                          <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white/[0.03] border border-white/8 px-5 py-2.5 rounded-xl cursor-not-allowed">
                                            🔒 Resources for approved attendees
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}

                                  {/* Reference resources */}
                                  {session.resources && session.resources.length > 0 && (
                                    <div>
                                      <div className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                        Reference Links
                                      </div>
                                      {isApproved ? (
                                        <div className="flex flex-wrap gap-2">
                                          {session.resources.map((r) => (
                                            <a
                                              key={r.url}
                                              href={r.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                              <ExternalLink size={12} /> {r.title}
                                            </a>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-600 italic">
                                          Resources unlocked for approved attendees.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} />
    </div>
  );
}
