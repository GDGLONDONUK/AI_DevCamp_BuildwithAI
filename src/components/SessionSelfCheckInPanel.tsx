"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, Loader2 } from "lucide-react";
import {
  fetchSessionCheckInStatus,
  postSelfAttendanceCheckIn,
  type CheckInStatusResult,
} from "@/lib/meApi";

type Props = {
  sessionId: string;
  expanded: boolean;
  hasSessionAccess: boolean;
  alreadyAttended: boolean;
  onAttended: () => void;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SessionSelfCheckInPanel({
  sessionId,
  expanded,
  hasSessionAccess,
  alreadyAttended,
  onAttended,
}: Props) {
  const [status, setStatus] = useState<CheckInStatusResult | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expanded || !hasSessionAccess) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSessionCheckInStatus(sessionId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, sessionId, hasSessionAccess]);

  if (!hasSessionAccess || alreadyAttended) return null;

  const submit = async () => {
    const trimmed = code.replace(/\D/g, "");
    if (trimmed.length < 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await postSelfAttendanceCheckIn(sessionId, trimmed);
      toast.success("You’re marked present for this session.");
      setCode("");
      onAttended();
      const s = await fetchSessionCheckInStatus(sessionId);
      setStatus(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 font-mono py-2">
        <Loader2 size={14} className="animate-spin text-cyan-400" />
        Checking live check-in…
      </div>
    );
  }

  if (!status.eligible) return null;

  if (!status.active) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
        <div className="flex items-center gap-2 text-cyan-300/90 font-mono text-xs font-bold mb-1">
          <KeyRound size={14} />
          Self check-in
        </div>
        {status.opensAt && status.closesAt ? (
          <p>
            Not open yet (or closed). Window:{" "}
            <span className="text-gray-300">{formatWhen(status.opensAt)}</span> –{" "}
            <span className="text-gray-300">{formatWhen(status.closesAt)}</span>.
          </p>
        ) : (
          <p>There is no live check-in window configured for this session.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.07] px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 text-cyan-200 font-mono text-xs font-bold">
        <KeyRound size={14} />
        Mark yourself present
      </div>
      <p className="text-xs text-gray-400 leading-snug">
        Enter the code the hosts shared during the session. This is only available for a limited time.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-36 bg-gray-950 border border-cyan-500/35 rounded-lg px-3 py-2 text-white font-mono tracking-[0.3em] text-center text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="6-digit check-in code"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold font-mono disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Confirm attendance"}
        </button>
      </div>
    </div>
  );
}
