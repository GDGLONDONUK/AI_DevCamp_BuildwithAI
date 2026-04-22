"use client";

import { useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { MapPin, MonitorPlay, Loader2, Calendar } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ensureProfileOnServer } from "@/lib/meApi";
import { kickoffRsvpWritePayload, KICKOFF_IN_PERSON_RSVP_POLICY } from "@/lib/kickoffRsvp";
import toast from "react-hot-toast";

/**
 * Fixed top strip: signed-in users must pick 23 Apr kick-off in person vs online.
 * Persists `kickoffInPersonRsvp`, `joiningInPerson`, `kickoffRsvpUpdatedAt`.
 */
export default function KickoffRsvpBanner() {
  const { user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<"in" | "online" | null>(null);

  const save = async (inPerson: boolean) => {
    if (!user || saving) return;
    setSaving(inPerson ? "in" : "online");
    try {
      const userRef = doc(db, "users", user.uid);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        await ensureProfileOnServer();
        if (!(await getDoc(userRef)).exists()) {
          throw new Error("Profile not ready. Try signing out and back in.");
        }
      }
      await updateDoc(userRef, {
        ...kickoffRsvpWritePayload(inPerson),
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success("Kick-off RSVP saved. Thank you!");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save RSVP");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      className="w-full border-b-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/98 via-gray-900/95 to-emerald-950/98 ring-1 ring-emerald-400/25 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      role="region"
      aria-label="23 April kick-off attendance RSVP"
      aria-labelledby="kickoff-rsvp-title"
      aria-describedby="kickoff-rsvp-desc"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="min-w-0 flex gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/35">
              <Calendar className="h-5 w-5 text-emerald-300" aria-hidden />
            </div>
            <div>
              <p
                id="kickoff-rsvp-title"
                className="text-base sm:text-lg font-extrabold text-white font-mono tracking-tight"
              >
                23 April kick-off — RSVP required
              </p>
              <p id="kickoff-rsvp-desc" className="text-sm sm:text-base text-gray-200 mt-1.5 leading-relaxed">
                {KICKOFF_IN_PERSON_RSVP_POLICY}{" "}
                Choose <strong className="text-white">in person (London)</strong> or{" "}
                <strong className="text-white">online only</strong> below.{" "}
                <span className="text-amber-200/95">
                  You need to complete this to take part in the kick-off — please pick one option.
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => void save(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-400/60 bg-emerald-600/40 px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500/40 disabled:opacity-50 font-mono min-h-[3rem] w-full sm:w-[220px] transition-colors"
            >
              {saving === "in" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5 text-emerald-200" />
              )}
              In person — London
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => void save(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-sky-400/50 bg-sky-600/30 px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg shadow-sky-900/25 hover:bg-sky-500/30 disabled:opacity-50 font-mono min-h-[3rem] w-full sm:w-[220px] transition-colors"
            >
              {saving === "online" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MonitorPlay className="h-5 w-5 text-sky-200" />
              )}
              Online only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
