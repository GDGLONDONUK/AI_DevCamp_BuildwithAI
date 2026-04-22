"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllUsers,
  applyBevyMerge,
  type BevyMergeResponse,
} from "@/lib/adminService";
import {
  parseBevyCsvText,
  computeBevyMergePlan,
  type BevyMergePlan,
  type BevyCsvRow,
} from "@/lib/admin/bevyMerge";
import type { UserProfile } from "@/types";
import {
  ArrowLeft,
  FileText,
  Link2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminBevyMergePage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [appUsers, setAppUsers] = useState<Awaited<
    ReturnType<typeof fetchAllUsers>
  > | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [fileName, setFileName] = useState("");
  const [bevyRows, setBevyRows] = useState<BevyCsvRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [dupCount, setDupCount] = useState(0);
  const [plan, setPlan] = useState<BevyMergePlan | null>(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<BevyMergeResponse | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setAppUsers(await fetchAllUsers());
    } catch {
      toast.error("Failed to load app users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") router.push("/");
  }, [loading, userProfile, router]);

  useEffect(() => {
    if (userProfile?.role === "admin") {
      void loadUsers();
    }
  }, [userProfile?.role, loadUsers]);

  useEffect(() => {
    if (!appUsers || !bevyRows) {
      setPlan(null);
      return;
    }
    const appDocs = appUsers.map((u) => ({
      id: (u as UserProfile).firestoreId || u.uid || u.email,
      data: { ...u } as Record<string, unknown>,
    }));
    setPlan(computeBevyMergePlan(bevyRows, appDocs));
  }, [appUsers, bevyRows]);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const p = parseBevyCsvText(text);
      if (!p.ok) {
        setParseError(p.error);
        setBevyRows(null);
        setParseWarnings([]);
        setDupCount(0);
        return;
      }
      setParseError(null);
      setBevyRows(p.rows);
      setParseWarnings(p.parseWarnings);
      setDupCount(p.duplicateCount);
    };
    reader.readAsText(file);
  };

  const handleApply = async () => {
    if (!bevyRows?.length) return;
    if (
      !window.confirm(
        "Write Bevy data to Firestore: update existing users and create missing pending rows? This cannot be auto-undone."
      )
    ) {
      return;
    }
    setApplying(true);
    setResult(null);
    try {
      const data = await applyBevyMerge(bevyRows);
      setResult(data);
      await loadUsers();
      toast.success(
        `Updated ${data.written.updated}, created ${data.written.created} pending user(s).`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setApplying(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/import"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">
              Bevy reconciliation
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Compare a Bevy export to everyone in <code className="text-green-400">users</code>.
              Matched people get <code className="text-amber-400/90">bevyRegisteredAt</code> and{" "}
              <code className="text-amber-400/90">bevyNameSnapshot</code>. People only on Bevy get
              a pending <code className="text-green-400">users/&lt;email&gt;</code> row.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loadingUsers}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingUsers ? "animate-spin" : ""} />
            {loadingUsers
              ? "Loading app users…"
              : appUsers
                ? `Loaded ${appUsers.length} app user document(s)`
                : "—"}
          </button>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Upload size={16} className="text-green-400" />
            Bevy export (.csv)
          </h2>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? "border-amber-400/80 bg-amber-500/10"
                : "border-white/15 hover:border-amber-500/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) processFile(f);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            <FileText
              size={28}
              className="mx-auto text-gray-600 mb-2"
            />
            {fileName ? (
              <p className="text-amber-300 font-mono text-sm">{fileName}</p>
            ) : (
              <p className="text-gray-300 text-sm">
                Drop a Bevy attendee export here or click to browse
              </p>
            )}
            <p className="text-gray-600 text-xs mt-2 max-w-md mx-auto">
              Headers are auto-detected (Email, name, date registered, etc.). Gmail / Googlemail
              aliases are treated as the same address.
            </p>
          </div>

          {parseError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {parseError}
            </div>
          )}

          {parseWarnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200/90 font-mono max-h-32 overflow-y-auto">
              {parseWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {bevyRows && bevyRows.length > 0 && !parseError && (
            <p className="text-sm text-gray-400">
              <span className="text-white font-mono">{bevyRows.length}</span> unique emails in
              export
              {dupCount > 0 && (
                <span className="text-yellow-400">
                  {" "}
                  (merged {dupCount} duplicate row{dupCount === 1 ? "" : "s"} by email, kept latest
                  date)
                </span>
              )}
            </p>
          )}

          {plan && bevyRows && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {(
                [
                  ["Bevy (unique)", plan.stats.bevyRowCount, "text-blue-400"],
                  ["App docs w/ email", plan.stats.appDocsWithEmail, "text-purple-300"],
                  ["To update (matched)", plan.stats.toUpdate, "text-green-400"],
                  ["To create (Bevy only)", plan.stats.toCreate, "text-amber-400"],
                ] as const
              ).map(([label, v, c]) => (
                <div
                  key={label}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-2"
                >
                  <div className={`text-xl font-bold font-mono ${c}`}>{v}</div>
                  <div className="text-gray-500 text-xs">{label}</div>
                </div>
              ))}
            </div>
          )}

          {plan && plan.inAppNotInBevy.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400/90 text-sm font-semibold">
                <AlertTriangle size={16} />
                In this app, not in Bevy export ({plan.inAppNotInBevy.length})
              </div>
              <p className="text-xs text-gray-500">
                Plan for manual follow-up — no rows are removed or downgraded. Examples: registered
                only on this site, or different email on Bevy.
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 text-xs font-mono">
                {plan.inAppNotInBevy.map((r) => (
                  <div
                    key={r.firestoreId}
                    className="px-2 py-1.5 border-b border-white/5 text-gray-300 flex justify-between gap-2"
                  >
                    <span>{r.email}</span>
                    <span className="text-gray-500 truncate">
                      {r.displayName}
                      {r.signedIn ? " · has account" : " · pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan && plan.inBevyNotInApp.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400/90 text-sm font-semibold">
                <Link2 size={16} />
                On Bevy only — will create pending <code className="text-cyan-300">users/&lt;email&gt;</code> (
                {plan.inBevyNotInApp.length})
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-cyan-500/20 text-xs font-mono">
                {plan.inBevyNotInApp.map((r) => (
                  <div
                    key={r.email}
                    className="px-2 py-1.5 border-b border-white/5 text-gray-300"
                  >
                    {r.displayName} · {r.email} · Bevy date {r.bevyRegisteredAt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan && plan.nameMismatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-400/90 font-semibold">
                Name differences (email matched) — {plan.nameMismatches.length}
              </p>
              <div className="max-h-32 overflow-y-auto text-xs font-mono rounded-lg border border-yellow-500/20">
                {plan.nameMismatches.map((n) => (
                  <div key={n.firestoreId} className="px-2 py-1 border-b border-white/5">
                    <span className="text-gray-400">{n.email}:</span> app “{n.appName}” · Bevy “
                    {n.bevyName}”
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!bevyRows?.length || applying || !plan}
            onClick={handleApply}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold font-mono bg-amber-600 hover:bg-amber-500 text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Writing to Firestore…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Apply merge to Firestore
              </>
            )}
          </button>

          {result && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              Done: <strong className="text-white">{result.written.updated}</strong> updated,{" "}
              <strong className="text-white">{result.written.created}</strong> created. Refresh the
              Pre-Registered tab to see new pending rows.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
