"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";

type Preview = {
  cohortId: string;
  required: number;
  qualifyingCount: number;
  oneSessionShortCount: number;
  others: number;
  qualifying: { uid: string; displayName: string; attendedCount: number }[];
  oneSessionShort: { uid: string; displayName: string; attendedCount: number }[];
  written?: number;
  skipped?: number;
};

type IssueResult = {
  dryRun: boolean;
  quota: number;
  wouldIssue: number;
  alreadyIssued: number;
  issued: number;
  failed: number;
};

export default function AdminCohortsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [issue, setIssue] = useState<IssueResult | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "moderator";

  const loadPreview = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch(`/api/admin/cohorts/close?cohortId=${SEPTEMBER_2026_COHORT_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Preview failed");
    setPreview(json.data);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/?login=1&redirect=%2Fadmin%2Fcohorts");
      return;
    }
    if (userProfile && !isAdmin) {
      router.push("/");
      return;
    }
    if (isAdmin) void loadPreview().catch((e) => toast.error(e.message));
  }, [authLoading, user, userProfile, isAdmin, router, loadPreview]);

  const closeCohort = async () => {
    if (!preview) return;
    if (
      !window.confirm(
        `Close ${preview.cohortId}? ${preview.qualifyingCount} people qualify. This is idempotent.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/cohorts/close", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cohortId: SEPTEMBER_2026_COHORT_ID, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Close failed");
      setPreview(json.data);
      toast.success(`Closed. Wrote ${json.data.written}, skipped ${json.data.skipped}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(false);
    }
  };

  const dryIssue = async () => {
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/certifier/issue-cohort", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cohortId: SEPTEMBER_2026_COHORT_ID, dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Dry run failed");
      setIssue(json.data);
      toast.success(
        `Dry run: ${json.data.wouldIssue} would issue (quota ${json.data.quota}/year). Already issued: ${json.data.alreadyIssued}`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dry run failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4 text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          <ArrowLeft size={14} /> Admin
        </Link>
        <h1 className="text-2xl font-extrabold font-mono">Close cohort</h1>
        <p className="text-sm text-gray-400">
          Registration stays open onto April 2027. Closing applies the 60% rule, stamps closing-day
          attendance, and does not issue Credsverse credentials.
        </p>

        {preview && (
          <div className="rounded-xl border border-white/10 p-4 space-y-2 text-sm">
            <p>
              Required: {preview.required} counted sessions. Qualifying: {preview.qualifyingCount}.
              One session short: {preview.oneSessionShortCount}. Others: {preview.others}.
            </p>
            {typeof preview.written === "number" && (
              <p className="text-green-400">
                Last apply wrote {preview.written}, skipped {preview.skipped}.
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-green-300">Qualifying names</summary>
              <ul className="mt-2 space-y-1 text-gray-300">
                {preview.qualifying.map((r) => (
                  <li key={r.uid}>
                    {r.displayName || r.uid} — {r.attendedCount}
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary className="cursor-pointer text-amber-300">One session short</summary>
              <ul className="mt-2 space-y-1 text-gray-300">
                {preview.oneSessionShort.map((r) => (
                  <li key={r.uid}>
                    {r.displayName || r.uid} — {r.attendedCount}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void closeCohort()} disabled={busy || !preview}>
            Close September 2026
          </Button>
          <Button variant="outline" onClick={() => void dryIssue()} disabled={busy}>
            Dry-run September certificates
          </Button>
        </div>
        {issue && (
          <p className="text-sm text-gray-400">
            {issue.dryRun ? "Dry run" : "Issued"}: would {issue.wouldIssue}, already{" "}
            {issue.alreadyIssued}, issued {issue.issued}, failed {issue.failed}. Free-plan quota{" "}
            {issue.quota}/year.
          </p>
        )}
      </div>
    </div>
  );
}
