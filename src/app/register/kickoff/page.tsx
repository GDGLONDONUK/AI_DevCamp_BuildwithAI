"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { MapPin, MonitorPlay, Loader2, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ensureProfileOnServer } from "@/lib/meApi";
import { joiningInPersonLabel, SESSION_SKIP_REGISTER_REDIRECT } from "@/lib/kickoffRsvp";
import toast from "react-hot-toast";

/**
 * After Google sign-up, users land here to RSVP for the 23 Apr kick-off (in-person vs online).
 * Clears sessionStorage flag used to avoid `/register` → `/dashboard` redirect race.
 */
export default function KickoffRsvpPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem(SESSION_SKIP_REGISTER_REDIRECT);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/register");
      return;
    }
    if (userProfile && typeof userProfile.kickoffInPersonRsvp === "boolean") {
      router.replace("/dashboard");
    }
  }, [loading, user, userProfile, router]);

  // Pre-fill from profile (form import merged at sign-up) if they said yes in-person
  useEffect(() => {
    if (choice !== null) return;
    const j = (userProfile?.joiningInPerson || "").toLowerCase().trim();
    if (j.startsWith("y")) setChoice(true);
  }, [userProfile?.joiningInPerson, choice]);

  const submit = async () => {
    if (choice === null || !user) {
      toast.error("Please choose an option");
      return;
    }
    setSaving(true);
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
        kickoffInPersonRsvp: choice,
        joiningInPerson: joiningInPersonLabel(choice),
        updatedAt: serverTimestamp(),
      });
      sessionStorage.removeItem(SESSION_SKIP_REGISTER_REDIRECT);
      await refreshProfile();
      toast.success("You are all set — see you at DevCamp!");
      router.replace("/dashboard");
    } catch (err) {
      console.error("Kickoff RSVP save failed:", err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Could not save — try again";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <p className="text-[10px] font-mono text-green-400/80 tracking-[0.25em] uppercase mb-2 text-center">
          One more step
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-2">
          23 April <span className="text-green-400">kick-off</span>
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Will you join <strong className="text-gray-300">in person in London</strong> or{" "}
          <strong className="text-gray-300">online only</strong>? We need numbers for the venue — and{" "}
          <span className="text-amber-400/90">swag is available for in-person attendees</span> while stocks last.
        </p>

        <div className="space-y-2 mb-8">
          <button
            type="button"
            onClick={() => setChoice(true)}
            className={`w-full text-left flex gap-3 p-4 rounded-xl border-2 transition-all ${
              choice === true ? "border-green-500 bg-green-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <MapPin size={22} className="text-green-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">In person — London (RSVP)</div>
              <div className="text-xs text-gray-400 mt-1">
                Skyscanner HQ · W1D 4AL · 6:00 PM · 23 April 2026
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setChoice(false)}
            className={`w-full text-left flex gap-3 p-4 rounded-xl border-2 transition-all ${
              choice === false ? "border-green-500 bg-green-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <MonitorPlay size={22} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">Online only</div>
              <div className="text-xs text-gray-400 mt-1">No in-person RSVP for the kick-off</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          disabled={saving || choice === null}
          onClick={submit}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-bold py-3.5 rounded-xl font-mono text-sm transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <>Continue to dashboard <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
