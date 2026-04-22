"use client";

import { CheckCircle2, Mail, XCircle } from "lucide-react";
import type { UserProfile } from "@/types";

interface Props {
  detailUser: UserProfile;
  onClose: () => void;
}

function hasAuthAccount(u: UserProfile): boolean {
  if (u.signedIn === false) return false;
  return Boolean(u.uid);
}

export default function PreRegisteredDetailModal({ detailUser, onClose }: Props) {
  const linked = hasAuthAccount(detailUser);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg h-full bg-[#0d1117] border-l border-white/10 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0d1117] border-b border-white/8 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">{detailUser.displayName}</h2>
            <p className="text-xs text-green-400 font-mono mt-0.5">{detailUser.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(
                  "emailRecipients",
                  JSON.stringify([{ email: detailUser.email, name: detailUser.displayName }])
                );
                window.open("/admin/email?source=selection", "_blank");
              }}
              className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 rounded-lg font-mono hover:bg-blue-500/20 transition-all"
            >
              <Mail size={12} /> Email
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-6 pt-5 pb-2">
          {linked ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-green-500/15 text-green-400 border border-green-500/25 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} /> Account created · signed up
              {detailUser.importLinkedAt && (
                <span className="text-green-600 ml-1">{new Date(detailUser.importLinkedAt).toLocaleDateString("en-GB")}</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full">
              <XCircle size={12} /> No account yet · invite pending
            </span>
          )}
        </div>

        <div className="px-6 pb-8 space-y-5">
          <section>
            <div className="text-[10px] font-mono text-green-400 uppercase tracking-widest mb-3 pb-1 border-b border-white/6">Registration</div>
            <dl className="space-y-2">
              {[
                ["Form Submitted", detailUser.formSubmittedAt ? new Date(detailUser.formSubmittedAt).toLocaleString("en-GB") : "—"],
                ["Current Role", detailUser.formRole || "—"],
                ["Years of Experience", detailUser.yearsOfExperience || "—"],
                ["Programming Knowledge", detailUser.knowsProgramming ? "Yes — knows at least one language" : "Beginner"],
                ["Commitment", detailUser.commitment ? "Confirmed" : "Not confirmed"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex gap-3">
                  <dt className="text-xs text-gray-500 font-mono w-44 shrink-0">{label}</dt>
                  <dd className="text-xs text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3 pb-1 border-b border-white/6">Location &amp; Attendance</div>
            <dl className="space-y-2">
              {[
                ["Joining In-Person", detailUser.joiningInPerson || "—"],
                [
                  "In person (admin confirmed)",
                  detailUser.kickoffInPersonAdminConfirmed === true
                    ? "Yes"
                    : detailUser.kickoffInPersonAdminConfirmed === false
                      ? "No"
                      : "—",
                ],
                ["Location (raw)", detailUser.location || "—"],
                ["City", detailUser.city || "—"],
                ["Country", detailUser.country || "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex gap-3">
                  <dt className="text-xs text-gray-500 font-mono w-44 shrink-0">{label}</dt>
                  <dd className="text-xs text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-3 pb-1 border-b border-white/6">AI Experience</div>
            <div className="mb-1 text-xs text-gray-500 font-mono">Prior AI Knowledge</div>
            <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/50 border border-white/6 rounded-lg p-3">
              {detailUser.priorAIKnowledge || "—"}
            </p>
          </section>

          <section>
            <div className="text-[10px] font-mono text-orange-400 uppercase tracking-widest mb-3 pb-1 border-b border-white/6">Interests &amp; Motivation</div>
            <div className="mb-1 text-xs text-gray-500 font-mono">Areas of Interest</div>
            <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/50 border border-white/6 rounded-lg p-3 mb-3">
              {detailUser.areasOfInterest || "—"}
            </p>
            <div className="mb-1 text-xs text-gray-500 font-mono">Why They Want to Join</div>
            <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/50 border border-white/6 rounded-lg p-3">
              {detailUser.whyJoin || "—"}
            </p>
          </section>

          {linked && detailUser.uid && (
            <section>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3 pb-1 border-b border-white/6">Internal</div>
              <dl className="space-y-2">
                <div className="flex gap-3">
                  <dt className="text-xs text-gray-500 font-mono w-44 shrink-0">Firebase UID</dt>
                  <dd className="text-xs text-gray-400 font-mono break-all">{detailUser.uid}</dd>
                </div>
                {detailUser.importLinkedAt && (
                  <div className="flex gap-3">
                    <dt className="text-xs text-gray-500 font-mono w-44 shrink-0">Profile linked at</dt>
                    <dd className="text-xs text-gray-400">{new Date(detailUser.importLinkedAt).toLocaleString("en-GB")}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
