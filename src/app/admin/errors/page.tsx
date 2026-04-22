"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchErrorLogsFromServer, postTestErrorLogEntry } from "@/lib/adminService";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AppErrorLog } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Filter,
  RefreshCw,
  Search,
  Bug,
} from "lucide-react";
import toast from "react-hot-toast";

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminErrorLogsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<AppErrorLog[]>([]);
  const [meta, setMeta] = useState<{ scanned: number; returned: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [testPosting, setTestPosting] = useState(false);
  const lastLoadedForUser = useRef<string | null>(null);

  async function load() {
    if (!user) return;
    setBusy(true);
    setLoadError(null);
    try {
      const a = new Date(from + "T00:00:00.000Z");
      const b = new Date(to + "T23:59:59.999Z");
      const res = await fetchErrorLogsFromServer({
        from: a.toISOString(),
        to: b.toISOString(),
        q: q.trim() || undefined,
        limit: 400,
      });
      setLogs(res.logs);
      setMeta({ scanned: res.scanned, returned: res.returned });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      toast.error("Could not load error logs");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [loading, user, userProfile, router]);

  useEffect(() => {
    if (!user || userProfile?.role !== "admin") {
      if (!user) lastLoadedForUser.current = null;
      return;
    }
    const id = String(user.uid);
    if (lastLoadedForUser.current === id) return;
    lastLoadedForUser.current = id;
    void load();
  }, [user, userProfile?.role]);

  if (loading || !user || userProfile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
              aria-label="Back to admin"
            >
              <ArrowLeft size={20} />
            </Link>
            <Bug className="text-amber-400" size={26} />
            <div>
              <h1 className="text-2xl font-extrabold text-white font-mono">Error logs</h1>
              <p className="text-xs text-gray-500 font-mono max-w-md">
                Collection <code className="text-amber-400/90">error_logs</code> — client, React, and API failures
                (last 800 scanned, then filtered). If the collection is empty in Firebase Console, use Test log
                once.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setTestPosting(true);
                try {
                  const id = await postTestErrorLogEntry();
                  toast.success(id ? `Test log written: ${id}` : "Test log written");
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not write test log");
                } finally {
                  setTestPosting(false);
                }
              }}
              disabled={testPosting || busy}
              className="inline-flex items-center gap-2 text-sm text-amber-200 border border-amber-500/35 bg-amber-500/10 px-4 py-2 rounded-lg font-mono hover:bg-amber-500/15 disabled:opacity-50"
            >
              {testPosting ? <RefreshCw size={14} className="animate-spin" /> : <Bug size={14} />}
              Test log
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy}
              className="inline-flex items-center gap-2 text-sm text-gray-300 border border-white/15 px-4 py-2 rounded-lg font-mono hover:bg-white/5"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-gray-900/50 border border-white/8 rounded-xl">
          <div>
            <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">From (UTC date)</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">To (UTC date)</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1 flex items-center gap-1">
              <Search size={10} /> Search message / path / stack
            </label>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. fetch, Firestore, minified"
                className="w-full bg-gray-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono"
              />
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold font-mono px-5 py-2.5 rounded-lg"
          >
            Apply filters
          </button>
        </div>

        {loadError && (
          <div className="mb-4 text-red-400 text-sm font-mono border border-red-500/20 rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        {meta && (
          <p className="text-xs text-gray-500 font-mono mb-3">
            Scanned {meta.scanned} document(s) · showing {meta.returned} in range
          </p>
        )}

        {busy && logs.length === 0 ? (
          <div className="flex justify-center py-20 text-gray-500 font-mono">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-gray-500 font-mono">
            No errors in this range. Try widening the date window.
          </div>
        ) : (
          <div className="border border-white/8 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-0 bg-gray-900/80 text-[10px] font-mono text-gray-500 uppercase tracking-wider px-3 py-2 border-b border-white/8">
              <div className="col-span-2">Time (UTC)</div>
              <div className="col-span-1">Source</div>
              <div className="col-span-3">Message</div>
              <div className="col-span-2">Path</div>
              <div className="col-span-2">User</div>
              <div className="col-span-2" />
            </div>
            <ul className="max-h-[70vh] overflow-y-auto">
              {logs.map((r) => {
                const ex = expandId === r.id;
                return (
                  <li
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandId(ex ? null : r.id)}
                      className="w-full text-left grid grid-cols-12 gap-0 px-3 py-2.5 items-start font-mono"
                    >
                      <div className="col-span-2 text-xs text-amber-200/90 whitespace-nowrap pr-2">
                        {formatAdminDateTime(r.createdAt)}
                      </div>
                      <div className="col-span-1 text-xs text-gray-400">{r.source}</div>
                      <div className="col-span-3 text-gray-200 line-clamp-2 pr-2">{r.message}</div>
                      <div className="col-span-2 text-xs text-gray-500 truncate" title={r.path}>
                        {r.path || "—"}
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 truncate" title={r.userEmail}>
                        {r.userEmail || r.userId || "—"}
                      </div>
                      <div className="col-span-2 text-right text-xs text-gray-600">
                        {ex ? "Hide" : "Details"} ▼
                      </div>
                    </button>
                    {ex && (
                      <div className="px-3 pb-3 pl-4 border-t border-white/5 bg-black/20">
                        {r.url && (
                          <p className="text-xs text-gray-500 mb-2 break-all">
                            <span className="text-gray-600">URL:</span> {r.url}
                          </p>
                        )}
                        {r.userAgent && (
                          <p className="text-xs text-gray-600 mb-2 break-all">UA: {r.userAgent}</p>
                        )}
                        {r.stack && (
                          <pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-all max-h-64 overflow-y-auto p-2 rounded-lg bg-gray-950 border border-white/5">
                            {r.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-600 font-mono flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
          High-volume abuse is mitigated by Firestore only accepting writes from the app API. For
          very large projects, add TTL / scheduled deletion in Firebase or move logs to
          BigQuery/Cloud Logging.
        </p>
      </div>
    </div>
  );
}
