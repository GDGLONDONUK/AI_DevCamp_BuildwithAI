"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { upsertPreRegisteredUsers, fetchPreRegisteredUsers } from "@/lib/adminService";
import { PreRegisteredUser } from "@/types";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Users, Link2, ArrowLeft, RefreshCw, Search,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { parseLocationFields } from "@/lib/locationCleanup";

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim());
        if (row.some(Boolean)) rows.push(row);
        row = []; field = "";
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

function rowToPreRegistered(row: string[]): PreRegisteredUser | null {
  if (row.length < 8) return null;
  const email = (row[2] || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return null;
  const { location, city, country } = parseLocationFields(row[10] || "");
  return {
    email,
    displayName: (row[1] || "").trim(),
    formSubmittedAt: (row[0] || "").trim(),
    formRole: (row[3] || "").trim(),
    yearsOfExperience: (row[4] || "").trim(),
    priorAIKnowledge: (row[5] || "").trim(),
    areasOfInterest: (row[6] || "").trim(),
    whyJoin: (row[7] || "").trim(),
    knowsProgramming: (row[8] || "").toLowerCase().includes("know"),
    joiningInPerson: (row[9] || "").trim(),
    location,
    city,
    country,
    commitment: (row[11] || "").toLowerCase().includes("understand"),
  };
}

// ── Deduplication: keep last entry per email ──────────────────────────────────

function deduplicate(users: PreRegisteredUser[]): {
  unique: PreRegisteredUser[];
  duplicates: { email: string; count: number }[];
} {
  const map = new Map<string, PreRegisteredUser>();
  const counts = new Map<string, number>();

  for (const u of users) {
    counts.set(u.email, (counts.get(u.email) ?? 0) + 1);
    map.set(u.email, u); // last one wins (latest timestamp when sorted)
  }

  const duplicates = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([email, count]) => ({ email, count }));

  return { unique: [...map.values()], duplicates };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminImportPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<PreRegisteredUser[]>([]);
  const [duplicates, setDuplicates] = useState<{ email: string; count: number }[]>([]);
  const [unique, setUnique] = useState<PreRegisteredUser[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [existingUsers, setExistingUsers] = useState<PreRegisteredUser[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") router.push("/");
  }, [loading, userProfile, router]);

  const loadExisting = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const users = await fetchPreRegisteredUsers();
      setExistingUsers(users.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch {
      toast.error("Failed to load existing records");
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      const users: PreRegisteredUser[] = [];
      for (let i = 1; i < rows.length; i++) {
        const u = rowToPreRegistered(rows[i]);
        if (u) users.push(u);
      }
      const { unique: u, duplicates: d } = deduplicate(users);
      setParsed(users);
      setUnique(u);
      setDuplicates(d);
      setUploaded(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!unique.length) return;
    setUploading(true);
    try {
      await upsertPreRegisteredUsers(unique);
      toast.success(`Uploaded ${unique.length} users to Firestore`);
      setUploaded(true);
      await loadExisting();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredExisting = existingUsers.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.includes(q) || u.displayName.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">CSV Import</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload Google Form responses → seed <code className="text-green-400">preRegistered</code> collection
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Rows in CSV", value: parsed.length, icon: FileText, color: "text-blue-400" },
            { label: "Duplicates removed", value: duplicates.length, icon: AlertTriangle, color: "text-yellow-400" },
            { label: "Unique to upload", value: unique.length, icon: Users, color: "text-green-400" },
            { label: "In Firestore now", value: existingUsers.length, icon: CheckCircle2, color: "text-purple-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-900 border border-white/10 rounded-xl p-4">
              <Icon size={16} className={`${color} mb-2`} />
              <div className="text-2xl font-bold text-white font-mono">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Upload size={16} className="text-green-400" />
            Upload CSV
          </h2>

          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-green-400 bg-green-500/10"
                : "border-white/15 hover:border-green-500/40 hover:bg-green-500/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Upload size={32} className="mx-auto text-gray-600 mb-3" />
            {fileName ? (
              <p className="text-green-400 font-mono text-sm">{fileName}</p>
            ) : (
              <>
                <p className="text-gray-300 text-sm font-medium">Drop your CSV here or click to browse</p>
                <p className="text-gray-600 text-xs mt-1 font-mono">Google Form export · _AI DevCamp 2026 - Registration.csv</p>
              </>
            )}
          </div>

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm mb-2">
                <AlertTriangle size={14} />
                {duplicates.length} duplicate email{duplicates.length > 1 ? "s" : ""} found — keeping latest entry
              </div>
              <div className="flex flex-wrap gap-2">
                {duplicates.slice(0, 20).map(({ email, count }) => (
                  <span key={email} className="text-xs font-mono bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                    {email} ×{count}
                  </span>
                ))}
                {duplicates.length > 20 && (
                  <span className="text-xs text-yellow-500 font-mono">+{duplicates.length - 20} more</span>
                )}
              </div>
            </div>
          )}

          {/* Preview table */}
          {unique.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 font-mono">
                  Preview — <span className="text-green-400">{unique.length}</span> unique users
                </p>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploaded}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold font-mono transition-all ${
                    uploaded
                      ? "bg-green-500/20 text-green-400 border border-green-500/20 cursor-default"
                      : uploading
                      ? "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-400 text-gray-950"
                  }`}
                >
                  {uploading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Uploading...</>
                  ) : uploaded ? (
                    <><CheckCircle2 size={14} /> Uploaded</>
                  ) : (
                    <><Upload size={14} /> Upload {unique.length} users</>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      {["Name", "Email", "Role", "Experience", "In Person", "Location", "Duplicate"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unique.slice(0, 100).map((u) => {
                      const isDup = duplicates.some((d) => d.email === u.email);
                      return (
                        <tr key={u.email} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-white whitespace-nowrap">{u.displayName}</td>
                          <td className="px-3 py-2 text-green-400 whitespace-nowrap">{u.email}</td>
                          <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{u.formRole}</td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{u.yearsOfExperience}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              u.joiningInPerson.toLowerCase().startsWith("y")
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {u.joiningInPerson || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{u.location || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {isDup ? (
                              <span className="text-yellow-400 text-[10px]">×{duplicates.find((d) => d.email === u.email)?.count}</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    {unique.length > 100 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-gray-600">
                          … {unique.length - 100} more rows not shown in preview
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Existing pre-registered users */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              Pre-registered in Firestore
              <span className="text-xs text-gray-500 font-mono">({existingUsers.length})</span>
            </h2>
            <button
              onClick={loadExisting}
              disabled={loadingExisting}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={loadingExisting ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40 font-mono"
            />
          </div>

          {loadingExisting ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : existingUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 font-mono text-sm">
              No pre-registered users yet. Upload a CSV above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    {["Name", "Email", "Role", "In Person", "Location", "Linked"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredExisting.map((u) => (
                    <tr key={u.email} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-white whitespace-nowrap">{u.displayName}</td>
                      <td className="px-3 py-2 text-green-400 whitespace-nowrap">{u.email}</td>
                      <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{u.formRole}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          (u.joiningInPerson || "").toLowerCase().startsWith("y")
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {u.joiningInPerson || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{u.location || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {u.linkedUid ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <Link2 size={10} /> Linked
                          </span>
                        ) : (
                          <span className="text-gray-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredExisting.length === 0 && (
                <div className="text-center py-6 text-gray-600 font-mono text-sm">No results</div>
              )}
            </div>
          )}

          {/* Linked stats */}
          {existingUsers.length > 0 && (
            <div className="flex gap-6 font-mono text-xs text-gray-500 pt-1">
              <span>
                <span className="text-green-400">{existingUsers.filter((u) => u.linkedUid).length}</span> linked to accounts
              </span>
              <span>
                <span className="text-yellow-400">{existingUsers.filter((u) => !u.linkedUid).length}</span> not yet signed up
              </span>
              <span>
                <span className="text-blue-400">{existingUsers.filter((u) => u.joiningInPerson?.toLowerCase().startsWith("y")).length}</span> joining in person
              </span>
              <span>
                <XCircle size={10} className="inline text-red-400 mr-1" />
                {duplicates.length} dupes removed from last CSV
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
