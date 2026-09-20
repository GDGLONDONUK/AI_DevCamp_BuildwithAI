"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { joinActiveCohort } from "@/lib/meApi";
import { getActiveCohortId, userInCohort } from "@/lib/cohorts";
import { isRegistrationOpen } from "@/lib/registrationOpen";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

/**
 * Shown to signed-in users who are not enrolled in the active cohort
 * (e.g. spring alumni). Luma-imported existing accounts are usually enrolled
 * on CSV upload; this banner covers anyone still missing the active cohort.
 */
export default function JoinCohortBanner() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const activeId = getActiveCohortId();

  if (!isRegistrationOpen()) return null;
  if (!user || !userProfile) return null;
  if (userProfile.role === "admin" || userProfile.role === "moderator") return null;
  if (userInCohort(userProfile.cohortIds, activeId)) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-amber-200 font-mono text-sm font-semibold">
            AI DevCamp September 2026 is open
          </p>
          <p className="text-amber-100/70 text-xs mt-0.5">
            Sign in complete — join the new cohort to access September sessions, attendance,
            assignments, and tasks. New to the programme? Use Register instead.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await joinActiveCohort(activeId);
              await refreshProfile?.();
              toast.success(
                r.alreadyJoined
                  ? "Already enrolled in September 2026"
                  : "Joined AI DevCamp September 2026"
              );
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not join cohort");
            } finally {
              setBusy(false);
            }
          }}
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs font-mono px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Join September 2026
        </button>
      </div>
    </div>
  );
}
