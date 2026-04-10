"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSessions } from "@/hooks/useSessions";
import {
  Calendar, Clock, ExternalLink, MapPin, ChevronDown,
  Lightbulb, BookOpen, Mic, Tag, Timer,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function SessionsPage() {
  const { user, userProfile } = useAuth();
  const { sessions, loading } = useSessions();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState(false);

  const isApproved =
    user &&
    ["participated", "certified"].includes(userProfile?.userStatus ?? "");

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Session Schedule
          </h1>
          <p className="text-gray-400 text-lg">
            {sessions.length} sessions across the programme. Join us in person or online.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
            <MapPin size={14} className="text-green-400" />
            Skyscanner, London, W1D 4AL
          </div>
        </div>

        {/* Info banner for non-members */}
        {!user && (
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8 text-sm text-blue-300">
            <BookOpen size={16} className="flex-shrink-0 mt-0.5" />
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
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 text-sm text-yellow-300">
            <Clock size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Your application is <strong>pending approval</strong>. Once approved you will get
              full access to all session materials and resources.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500">Sessions will be announced soon. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isOpen = expanded === session.id;

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? "border-green-500/40 bg-green-500/[0.04]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  {/* Session header — always visible */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                    className="w-full text-left p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Number badge */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold ${
                        session.isKickoff || session.isClosing
                          ? "bg-gradient-to-br from-green-500 to-green-700 text-white"
                          : "bg-white/10 text-white"
                      }`}>
                        <span className="text-xs opacity-60">S</span>
                        <span className="text-xl leading-none">{session.number}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">{session.title}</h3>
                          {session.isKickoff && (
                            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">🚀 Kick Off</span>
                          )}
                          {session.isClosing && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">🏆 Closing</span>
                          )}
                          <span className="text-xs bg-white/8 text-gray-500 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                            Week {session.week}
                          </span>
                        </div>

                        {session.topic && (
                          <p className="text-sm font-semibold text-green-400 mb-1">{session.topic}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          {session.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-green-400" /> {session.date}
                            </span>
                          )}
                          {session.time && (
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} className="text-green-400" /> {session.time}
                            </span>
                          )}
                          {session.duration && (
                            <span className="flex items-center gap-1.5">
                              <Timer size={12} className="text-green-400" /> {session.duration}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {session.tags && session.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {session.tags.map((t) => (
                              <span key={t} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ChevronDown
                        size={18}
                        className={`text-gray-500 flex-shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-6 pb-6 space-y-5 border-t border-white/8 pt-5">

                      {/* Description */}
                      {session.description && (
                        <p className="text-sm text-gray-400 leading-relaxed">{session.description}</p>
                      )}

                      {/* Speaker */}
                      {session.speaker && (
                        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-3">
                          {session.speakerPhoto ? (
                            <img src={session.speakerPhoto} alt={session.speaker}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {session.speaker[0]}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Mic size={12} className="text-green-400" />
                              <span className="text-sm font-semibold text-white">{session.speaker}</span>
                            </div>
                            {session.speakerTitle && (
                              <p className="text-xs text-gray-500 mt-0.5">{session.speakerTitle}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* What you'll learn + Build ideas — locked unless approved */}
                      {(session.whatYouWillLearn?.length || session.buildIdeas?.length) && (
                        isApproved ? (
                          <div className="grid sm:grid-cols-2 gap-4">
                            {session.whatYouWillLearn && session.whatYouWillLearn.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                  <BookOpen size={12} className="text-blue-400" /> What you'll learn
                                </div>
                                <ul className="space-y-1.5">
                                  {session.whatYouWillLearn.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                                      <span className="text-blue-400 mt-0.5">▸</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {session.buildIdeas && session.buildIdeas.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                  <Lightbulb size={12} className="text-purple-400" /> Build ideas
                                </div>
                                <ul className="space-y-1.5">
                                  {session.buildIdeas.map((idea) => (
                                    <li key={idea} className="flex items-start gap-2 text-sm text-gray-300">
                                      <span className="text-purple-400 mt-0.5">💡</span>
                                      {idea}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-4 text-sm text-gray-500">
                            <BookOpen size={16} className="text-gray-600 flex-shrink-0" />
                            <span>Full session content is available to approved attendees.</span>
                          </div>
                        )
                      )}

                      {/* Video recording + Resources folder */}
                      {(session.videoUrl || session.resourcesFolderUrl) && (
                        <div className="flex flex-wrap gap-3">
                          {session.videoUrl && (
                            isApproved ? (
                              <a
                                href={session.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-xl transition-colors"
                              >
                                ▶ Watch Recording
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white/[0.03] border border-white/8 px-4 py-2 rounded-xl cursor-not-allowed">
                                🔒 Recording available to approved attendees
                              </span>
                            )
                          )}
                          {session.resourcesFolderUrl && (
                            isApproved ? (
                              <a
                                href={session.resourcesFolderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-sky-600/80 hover:bg-sky-600 px-4 py-2 rounded-xl transition-colors"
                              >
                                📁 Open Resources Folder
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white/[0.03] border border-white/8 px-4 py-2 rounded-xl cursor-not-allowed">
                                🔒 Resources folder for approved attendees
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Reference resources — locked unless approved */}
                      {session.resources && session.resources.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
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
                                  className="inline-flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <ExternalLink size={11} /> {r.title}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 italic">
                              Resources unlocked for approved attendees.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} defaultMode="login" />
    </div>
  );
}
