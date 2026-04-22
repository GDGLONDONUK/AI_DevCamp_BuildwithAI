"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUsersLocationMap } from "@/lib/adminService";
import { UsersLocationMap } from "@/components/admin/UsersLocationMap";
import type { UserMapFailedEntry, UserMapPoint } from "@/types";
import { AlertTriangle, ArrowLeft, MapPin, RefreshCw, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUsersMapPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [points, setPoints] = useState<UserMapPoint[] | null>(null);
  const [failed, setFailed] = useState<UserMapFailedEntry[]>([]);
  const [skippedNoLocation, setSkippedNoLocation] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setLoadError(null);
    try {
      const data = await fetchUsersLocationMap();
      setPoints(data.points);
      setFailed(data.failed);
      setSkippedNoLocation(data.skippedNoLocation);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      toast.error("Could not load user map data");
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [loading, user, userProfile, router]);

  useEffect(() => {
    if (!user || userProfile?.role !== "admin") return;
    void load();
  }, [user, userProfile?.role, load]);

  if (loading || !user || userProfile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white font-mono mb-3"
            >
              <ArrowLeft size={16} />
              Back to admin
            </Link>
            <div className="flex items-center gap-3">
              <MapPin className="text-emerald-400" size={28} />
              <div>
                <h1 className="text-2xl font-extrabold text-white font-mono">
                  Users map
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  Registration locations (from profile city / country / location
                  when provided)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono hidden sm:inline max-w-sm">
              First load geocodes unique places via Nominatim and may take
              1+ seconds per location.
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg font-mono transition-all disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={busy ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 font-mono">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            {loadError}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-900/60 border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-white font-mono">
              {points?.length ?? "—"}
            </div>
            <div className="text-xs text-gray-500 font-mono">Plotted on map</div>
          </div>
          <div className="bg-gray-900/60 border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-200/90 font-mono">
              {failed.length}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Could not geocode
            </div>
          </div>
          <div className="bg-gray-900/60 border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-300 font-mono">
              {skippedNoLocation}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              No / too-short location
            </div>
          </div>
        </div>

        {busy && points === null ? (
          <div className="flex flex-col items-center justify-center h-[min(70vh,560px)] min-h-[360px] rounded-xl border border-white/10 bg-gray-900/30">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-3" />
            <p className="text-sm text-gray-400 font-mono text-center px-4">
              Geocoding user locations (may take a while on first load)…
            </p>
          </div>
        ) : !busy && !loadError && (points?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center h-[min(50vh,400px)] rounded-xl border border-white/10 bg-gray-900/30 text-center px-4">
            <Shield className="text-gray-600 mb-2" size={40} />
            <p className="text-white font-mono text-sm">
              No mappable users yet.
            </p>
            <p className="text-gray-500 text-xs font-mono mt-2 max-w-md">
              Users need a location string longer than 2 characters (from
              location field, or city and country).
            </p>
          </div>
        ) : points && points.length > 0 ? (
          <UsersLocationMap points={points} />
        ) : null}

        {failed.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-amber-200/90 font-mono mb-2">
              Not geocoded
            </h2>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-gray-900/40">
              <ul className="text-xs font-mono divide-y divide-white/5">
                {failed.map((f, i) => (
                  <li
                    key={`${f.email}-${f.label}-${i}`}
                    className="px-3 py-2 text-gray-300"
                  >
                    <span className="text-white">{f.displayName}</span>
                    {f.email ? (
                      <span className="text-gray-500"> — {f.email}</span>
                    ) : null}
                    <div className="text-gray-500 mt-0.5">{f.label}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
