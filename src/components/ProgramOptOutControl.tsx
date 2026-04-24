"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { leaveProgramOnServer } from "@/lib/meApi";
import toast from "react-hot-toast";
import { BellOff, UserMinus } from "lucide-react";

type Props = {
  variant: "menu" | "dashboard";
  /** Close parent menu (e.g. navbar dropdown). */
  onAfterChange?: () => void;
};

export default function ProgramOptOutControl({ variant, onAfterChange }: Props) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const optedOut = userProfile?.programOptOut === true;
  if (optedOut) return null;

  const runOptOut = async () => {
    if (
      !window.confirm(
        "Leave the programme? You will be signed out and cannot log in again until an organiser restores your access. You will not receive cohort emails."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await leaveProgramOnServer();
      await signOut(auth);
      document.cookie = "firebase-session=; path=/; max-age=0";
      toast.success("You have left the programme.");
      onAfterChange?.();
      router.push("/");
    } catch {
      toast.error("Could not complete leaving the programme. Try again or contact the organisers.");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "menu") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={runOptOut}
        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-200/95 hover:text-amber-100 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
      >
        <UserMinus size={16} />
        Leave programme
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/80 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-300">
          <BellOff size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-base">Leave the programme</h2>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            If you no longer wish to take part, you can de-register. You will be signed out and cannot use the site
            until an organiser restores your access. You will not receive cohort emails.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runOptOut}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15 text-amber-100 text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
            >
              <UserMinus size={16} />
              Leave programme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
