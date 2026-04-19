"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Assignment, Project, Session, UserProfile, UserStatus } from "@/types";
import { getSessions, upsertSession, deleteSession, seedDefaultSessions } from "@/lib/sessionService";
import {
  fetchAllUsers, fetchAllAssignments, fetchAllProjects, fetchAttendanceForUsers,
  setUserStatus, setUserRole, setAssignmentStatus, setProjectStatus,
  toggleAttendance as toggleAttendanceSvc,
} from "@/lib/adminService";
import CountryFlag from "@/components/ui/CountryFlag";
import SessionEditor from "@/components/admin/SessionEditor";
import StatusDropdown, { STATUS_CONFIG, ALL_STATUSES } from "@/components/admin/StatusDropdown";
import {
  Users, BookOpen, Code2, Shield, Search,
  CheckCircle2, XCircle, ClipboardList, Calendar,
  RefreshCw, Plus, Pencil, Trash2,
  Link, Download, LayoutGrid, Table2, Filter,
  Clock, UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ───────────────────────────────────────────────────────────────────

type Tab = "attendance" | "users" | "assignments" | "projects" | "sessions";

interface AttendanceMap {
  [userId: string]: {
    [sessionId: string]: boolean;
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("attendance");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingCell, setTogglingCell] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Partial<Session> | null | false>(false); // false=closed, null=new
  const [usersView, setUsersView] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");

  // ── Access guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, loading, router]);

  // ── Load all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user || userProfile?.role !== "admin") return;
    setDataLoading(true);
    try {
      const [loadedUsers, loadedAssignments, loadedProjects, loadedSessions] =
        await Promise.all([
          fetchAllUsers(),
          fetchAllAssignments(),
          fetchAllProjects(),
          getSessions(),
        ]);

      setUsers(loadedUsers);
      setAssignments(loadedAssignments);
      setProjects(loadedProjects);
      setSessions(loadedSessions);

      const attMap = await fetchAttendanceForUsers(loadedUsers.map((u) => u.uid));
      setAttendance(attMap);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setDataLoading(false);
    }
  }, [user, userProfile]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Attendance toggle ─────────────────────────────────────────────────────
  const toggleAttendance = async (userId: string, sessionId: string) => {
    const key = `${userId}_${sessionId}`;
    setTogglingCell(key);
    const current = attendance[userId]?.[sessionId] ?? false;
    try {
      const next = await toggleAttendanceSvc(userId, sessionId, current);
      setAttendance((prev) => ({
        ...prev,
        [userId]: { ...(prev[userId] ?? {}), [sessionId]: next },
      }));
    } catch {
      toast.error("Failed to update attendance");
    } finally {
      setTogglingCell(null);
    }
  };

  // ── Update user status / role ─────────────────────────────────────────────
  const updateUserStatus = async (uid: string, status: UserStatus) => {
    try {
      await setUserStatus(uid, status);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, userStatus: status } : u));
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
  };

  const updateUserRole = async (uid: string, role: UserProfile["role"]) => {
    try {
      await setUserRole(uid, role);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role } : u));
      toast.success("Role updated");
    } catch { toast.error("Failed to update role"); }
  };

  const updateAssignmentStatus = async (id: string, status: Assignment["status"]) => {
    try {
      await setAssignmentStatus(id, status);
      setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      toast.success("Assignment updated");
    } catch { toast.error("Failed"); }
  };

  const updateProjectStatus = async (id: string, status: Project["status"]) => {
    try {
      await setProjectStatus(id, status);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      toast.success("Project updated");
    } catch { toast.error("Failed"); }
  };

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.handle?.toLowerCase().includes(search.toLowerCase())
  );

  const statusFilteredUsers = statusFilter === "all"
    ? filteredUsers
    : filteredUsers.filter((u) => (u.userStatus || "pending") === statusFilter);

  const pendingUsers = users.filter((u) => (u.userStatus || "pending") === "pending");

  const filteredAssignments = assignments.filter(
    (a) =>
      a.userName?.toLowerCase().includes(search.toLowerCase()) ||
      a.title?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.userName?.toLowerCase().includes(search.toLowerCase()) ||
      p.title?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Session CRUD ──────────────────────────────────────────────────────────
  const handleSaveSession = async (s: Session) => {
    await upsertSession(s);
    setSessions((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      return idx >= 0
        ? [...prev.slice(0, idx), s, ...prev.slice(idx + 1)]
        : [...prev, s].sort((a, b) => a.number - b.number);
    });
    setEditingSession(false);
    toast.success(s.id ? "Session saved" : "Session created");
  };

  const handleDeleteSession = async (s: Session) => {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    await deleteSession(s.id);
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    toast.success("Session deleted");
  };

  const handleSeedSessions = async (force = false) => {
    const added = await seedDefaultSessions(force);
    const fresh = await getSessions();
    setSessions(fresh);
    if (force) {
      toast.success(`Re-seeded all ${added} sessions with latest data`);
    } else if (added === 0) {
      toast("All default sessions already exist — use Re-seed to overwrite", { icon: "ℹ️" });
    } else {
      toast.success(`Imported ${added} default session${added > 1 ? "s" : ""}`);
    }
  };

  // ── Attendance summary ────────────────────────────────────────────────────
  const attendanceCount = (uid: string) =>
    sessions.filter((s) => attendance[uid]?.[s.id]).length;

  // ── Date formatter ────────────────────────────────────────────────────────
  function formatDateTime(val: unknown): string {
    if (!val) return "—";
    // Firestore Timestamp
    if (val && typeof (val as { toDate?: () => Date }).toDate === "function") {
      return (val as { toDate: () => Date }).toDate().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
    if (val instanceof Date) {
      return val.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
    if (typeof val === "string") {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      }
      return val;
    }
    return String(val);
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportUsersCSV(list: UserProfile[]) {
    const headers = [
      "Name", "Handle", "Email", "Role", "Status",
      "Experience Level", "City", "Country",
      "LinkedIn URL", "GitHub URL", "Website URL",
      "Sessions Attended", "Skills", "Expertise",
      "Want to Learn", "Can Offer",
      "Registered At", "Updated At",
    ];
    const rows = list.map((u) => [
      u.displayName || "",
      u.handle ? `@${u.handle}` : "",
      u.email || "",
      u.role || "",
      u.userStatus || "pending",
      u.experienceLevel || "",
      u.city || "",
      u.country || "",
      u.linkedinUrl || "",
      u.githubUrl || "",
      u.websiteUrl || "",
      `${attendanceCount(u.uid)}/${sessions.length}`,
      (u.skills || []).join("; "),
      (u.expertise || []).join("; "),
      (u.wantToLearn || []).join("; "),
      (u.canOffer || []).join("; "),
      formatDateTime(u.createdAt),
      formatDateTime(u.updatedAt),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-devcamp-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || !user || userProfile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const TABS = [
    { id: "attendance" as Tab, label: "Attendance", icon: ClipboardList, count: users.length },
    { id: "users" as Tab,      label: "Users",      icon: Users,          count: users.length },
    { id: "sessions" as Tab,   label: "Sessions",   icon: Calendar,       count: sessions.length },
    { id: "assignments" as Tab,label: "Assignments", icon: BookOpen,       count: assignments.length },
    { id: "projects" as Tab,   label: "Projects",   icon: Code2,          count: projects.length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-green-400" />
            <div>
              <h1 className="text-2xl font-extrabold text-white font-mono">Admin Panel</h1>
              <p className="text-xs text-gray-500 font-mono">AI DevCamp 2026 — Build with AI</p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg font-mono transition-all"
          >
            <RefreshCw size={14} className={dataLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <div key={id} className="bg-gray-900/60 border border-white/8 rounded-xl p-4">
              <Icon size={18} className="text-green-400 mb-2" />
              <div className="text-2xl font-bold text-white font-mono">{count}</div>
              <div className="text-xs text-gray-500 font-mono">{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or handle..."
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/40 border border-white/8 rounded-xl p-1 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold font-mono transition-all ${
                activeTab === id
                  ? "bg-green-500 text-gray-950 shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* ── ATTENDANCE TAB ── */}
            {activeTab === "attendance" && (
              <div className="overflow-x-auto rounded-xl border border-white/8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/80 border-b border-white/8">
                      <th className="text-left px-4 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                        Name
                      </th>
                      <th className="text-center px-3 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider">
                        Flag
                      </th>
                      {sessions.map((s) => (
                        <th key={s.id} className="text-center px-2 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                          <div>S{s.number}</div>
                          <div className="text-gray-600 font-normal normal-case text-[10px] mt-0.5 truncate max-w-[80px]">
                            {s.title.split(" ").slice(0, 2).join(" ")}
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider min-w-[90px]">
                        Total
                      </th>
                      <th className="text-center px-3 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider min-w-[130px]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={sessions.length + 4} className="text-center py-10 text-gray-500 font-mono">
                          No users found
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((u, idx) => {
                      const status = u.userStatus || "pending";
                      const sc = STATUS_CONFIG[status];
                      const country = u.country || "";
                      const city = u.city || "";
                      const location = [city, country].filter(Boolean).join(", ");

                      return (
                        <tr
                          key={u.uid}
                          className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                            idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                          }`}
                        >
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white text-sm">{u.displayName}</div>
                            <div className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{u.email}</div>
                            {location && (
                              <div className="text-xs text-gray-600 mt-0.5">{location}</div>
                            )}
                          </td>

                          {/* Country flag */}
                          <td className="px-3 py-3 text-center">
                            {country ? (
                              <CountryFlag country={country} size={28} />
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Session attendance cells */}
                          {sessions.map((s) => {
                            const attended = attendance[u.uid]?.[s.id] ?? false;
                            const cellKey = `${u.uid}_${s.id}`;
                            const isToggling = togglingCell === cellKey;
                            return (
                              <td key={s.id} className="px-2 py-3 text-center">
                                <button
                                  onClick={() => toggleAttendance(u.uid, s.id)}
                                  disabled={isToggling}
                                  title={attended ? "Mark absent" : "Mark attended"}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all disabled:opacity-50 min-w-[52px] justify-center ${
                                    attended
                                      ? "bg-green-500/25 text-green-300 border border-green-500/50 hover:bg-red-500/25 hover:text-red-300 hover:border-red-500/50"
                                      : "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-green-500/15 hover:text-green-300 hover:border-green-500/30"
                                  }`}
                                >
                                  {isToggling ? (
                                    <span className="animate-spin text-xs">◌</span>
                                  ) : attended ? (
                                    <><CheckCircle2 size={11} /> Y</>
                                  ) : (
                                    <><XCircle size={11} /> N</>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Total attended */}
                          <td className="px-3 py-3 text-center">
                            <span className={`font-mono font-bold text-sm ${
                              attendanceCount(u.uid) >= 4 ? "text-green-400" :
                              attendanceCount(u.uid) >= 2 ? "text-yellow-400" :
                              "text-gray-500"
                            }`}>
                              {attendanceCount(u.uid)}/{sessions.length}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 text-center">
                            <StatusDropdown
                              status={status}
                              onChange={(s) => updateUserStatus(u.uid, s)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
              <div>

                {/* ── Summary bar ── */}
                <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-gray-900/60 border border-white/8 rounded-xl">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-green-400" />
                    <span className="font-mono font-bold text-white text-lg">{users.length}</span>
                    <span className="font-mono text-gray-400 text-sm">registered · cap 60</span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex-1 min-w-[120px] h-2 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${Math.min((users.length / 60) * 100, 100)}%` }}
                    />
                  </div>
                  {pendingUsers.length > 0 && (
                    <button
                      onClick={() => setStatusFilter("pending")}
                      className="flex items-center gap-1.5 text-sm text-yellow-400 font-semibold font-mono hover:text-yellow-300 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      {pendingUsers.length} Pending Approval
                    </button>
                  )}
                </div>

                {/* ── Pending quick-approve strip ── */}
                {pendingUsers.length > 0 && statusFilter !== "pending" && (
                  <div className="mb-5 p-4 bg-yellow-500/[0.06] border border-yellow-500/20 rounded-xl">
                    <div className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-3">
                      Awaiting approval
                    </div>
                    <div className="space-y-2">
                      {pendingUsers.slice(0, 3).map((u) => (
                        <div key={u.uid} className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-gray-950 font-bold text-xs flex-shrink-0">
                            {(u.displayName || u.email || "?")[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">{u.displayName}</span>
                          <span className="text-gray-500 font-mono text-xs">{u.email}</span>
                          <span className="text-gray-600 font-mono text-xs ml-auto">
                            {formatDateTime(u.createdAt)}
                          </span>
                          <button
                            onClick={() => updateUserStatus(u.uid, "participated")}
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-semibold font-mono"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => updateUserStatus(u.uid, "not-certified")}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold font-mono"
                          >
                            <XCircle size={13} /> Decline
                          </button>
                        </div>
                      ))}
                      {pendingUsers.length > 3 && (
                        <button
                          onClick={() => setStatusFilter("pending")}
                          className="text-xs text-yellow-400 font-mono mt-1 hover:underline"
                        >
                          + {pendingUsers.length - 3} more pending…
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Toolbar ── */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {/* Status filter */}
                  <div className="flex items-center gap-1.5 bg-gray-900/60 border border-white/8 rounded-xl p-1">
                    {(["all", ...ALL_STATUSES] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s as "all" | UserStatus)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all capitalize ${
                          statusFilter === s
                            ? "bg-green-500 text-gray-950"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {s === "all"
                          ? `All (${filteredUsers.length})`
                          : `${s} (${filteredUsers.filter((u) => (u.userStatus || "pending") === s).length})`
                        }
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* View toggle */}
                    <div className="flex items-center bg-gray-900/60 border border-white/8 rounded-xl p-1">
                      <button
                        onClick={() => setUsersView("grid")}
                        title="Card view"
                        className={`p-1.5 rounded-lg transition-all ${usersView === "grid" ? "bg-green-500 text-gray-950" : "text-gray-400 hover:text-white"}`}
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        onClick={() => setUsersView("table")}
                        title="Full table"
                        className={`p-1.5 rounded-lg transition-all ${usersView === "table" ? "bg-green-500 text-gray-950" : "text-gray-400 hover:text-white"}`}
                      >
                        <Table2 size={15} />
                      </button>
                    </div>

                    {/* CSV export */}
                    <button
                      onClick={() => exportUsersCSV(statusFilteredUsers)}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl font-mono transition-all"
                      title="Download as CSV"
                    >
                      <Download size={14} />
                      CSV
                    </button>
                  </div>
                </div>

                {statusFilteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-10 font-mono">No users match this filter</p>
                )}

                {/* ── GRID VIEW ── */}
                {usersView === "grid" && (
                  <div className="space-y-3">
                    {statusFilteredUsers.map((u) => {
                      const status = u.userStatus || "pending";
                      const sc = STATUS_CONFIG[status];
                      const country = u.country || "";
                      const city = u.city || "";
                      const location = [city, country].filter(Boolean).join(", ");

                      return (
                        <div key={u.uid} className="flex flex-wrap items-center gap-4 bg-gray-900/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(u.displayName || u.email || "?")[0].toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white">{u.displayName}</span>
                              {u.handle && <span className="font-mono text-xs text-gray-500">@{u.handle}</span>}
                              {country && <CountryFlag country={country} size={20} />}
                            </div>
                            <div className="text-xs text-gray-400 font-mono truncate">{u.email}</div>
                            {location && <div className="text-xs text-gray-600 font-mono">{location}</div>}
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full font-mono">
                                {attendanceCount(u.uid)}/{sessions.length} sessions
                              </span>
                              {u.experienceLevel && (
                                <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full capitalize font-mono">
                                  {u.experienceLevel}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-600 font-mono">
                                <Clock size={10} /> {formatDateTime(u.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Quick approve/decline for pending */}
                          {status === "pending" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateUserStatus(u.uid, "participated")}
                                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:bg-green-500/10 px-3 py-1.5 rounded-lg font-mono font-semibold transition-all"
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                              <button
                                onClick={() => updateUserStatus(u.uid, "not-certified")}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg font-mono font-semibold transition-all"
                              >
                                <XCircle size={12} /> Decline
                              </button>
                            </div>
                          )}

                          {/* Controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusDropdown
                              status={status}
                              onChange={(s) => updateUserStatus(u.uid, s)}
                            />
                            <select
                              value={u.role}
                              onChange={(e) => updateUserRole(u.uid, e.target.value as UserProfile["role"])}
                              className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                            >
                              <option value="attendee">Attendee</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── TABLE VIEW ── */}
                {usersView === "table" && (
                  <div className="overflow-x-auto rounded-xl border border-white/8">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-900/80 border-b border-white/8">
                          {[
                            "Name / Email", "Handle", "Location", "Role", "Status",
                            "Experience", "Sessions", "Skills",
                            "Registered At", "Updated At",
                            "Actions",
                          ].map((h) => (
                            <th key={h} className="text-left px-4 py-3 font-mono text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {statusFilteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={11} className="text-center py-10 text-gray-500 font-mono">
                              No users
                            </td>
                          </tr>
                        )}
                        {statusFilteredUsers.map((u, idx) => {
                          const status = u.userStatus || "pending";
                          const sc = STATUS_CONFIG[status];
                          const country = u.country || "";
                          const city = u.city || "";
                          const location = [city, country].filter(Boolean).join(", ");

                          return (
                            <tr
                              key={u.uid}
                              className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                                idx % 2 === 0 ? "" : "bg-white/[0.01]"
                              }`}
                            >
                              {/* Name */}
                              <td className="px-4 py-3 min-w-[180px]">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                    {(u.displayName || u.email || "?")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white text-sm">{u.displayName}</div>
                                    <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              {/* Handle */}
                              <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                                {u.handle ? `@${u.handle}` : "—"}
                              </td>
                              {/* Location */}
                              <td className="px-4 py-3 min-w-[130px]">
                                <div className="flex items-center gap-1.5">
                                  {country && <CountryFlag country={country} size={18} />}
                                  <span className="text-xs text-gray-400">{location || "—"}</span>
                                </div>
                              </td>
                              {/* Role */}
                              <td className="px-4 py-3">
                                <select
                                  value={u.role}
                                  onChange={(e) => updateUserRole(u.uid, e.target.value as UserProfile["role"])}
                                  className="bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                                >
                                  <option value="attendee">attendee</option>
                                  <option value="moderator">moderator</option>
                                  <option value="admin">admin</option>
                                </select>
                              </td>
                              {/* Status */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <StatusDropdown
                                  status={status}
                                  onChange={(s) => updateUserStatus(u.uid, s)}
                                />
                              </td>
                              {/* Experience */}
                              <td className="px-4 py-3 text-xs text-gray-400 font-mono capitalize whitespace-nowrap">
                                {u.experienceLevel || "—"}
                              </td>
                              {/* Sessions */}
                              <td className="px-4 py-3 text-center font-mono text-sm font-bold whitespace-nowrap">
                                <span className={
                                  attendanceCount(u.uid) >= 4 ? "text-green-400" :
                                  attendanceCount(u.uid) >= 2 ? "text-yellow-400" :
                                  "text-gray-500"
                                }>
                                  {attendanceCount(u.uid)}/{sessions.length}
                                </span>
                              </td>
                              {/* Skills */}
                              <td className="px-4 py-3 max-w-[180px]">
                                <div className="flex flex-wrap gap-1">
                                  {(u.skills || []).slice(0, 3).map((s) => (
                                    <span key={s} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full font-mono">
                                      {s}
                                    </span>
                                  ))}
                                  {(u.skills || []).length > 3 && (
                                    <span className="text-[10px] text-gray-500 font-mono">+{(u.skills || []).length - 3}</span>
                                  )}
                                </div>
                              </td>
                              {/* Registered At */}
                              <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                                {formatDateTime(u.createdAt)}
                              </td>
                              {/* Updated At */}
                              <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                                {formatDateTime(u.updatedAt)}
                              </td>
                              {/* Quick actions for pending */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {status === "pending" ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateUserStatus(u.uid, "participated")}
                                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-mono font-semibold"
                                    >
                                      <CheckCircle2 size={12} /> Approve
                                    </button>
                                    <button
                                      onClick={() => updateUserStatus(u.uid, "not-certified")}
                                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-mono font-semibold"
                                    >
                                      <XCircle size={12} /> Decline
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border border-current/30 ${sc.bg} ${sc.text}`}>
                                    {sc.label}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Table footer */}
                    <div className="px-4 py-3 bg-gray-900/40 border-t border-white/5 flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-500">
                        Showing {statusFilteredUsers.length} of {users.length} users
                      </span>
                      <button
                        onClick={() => exportUsersCSV(statusFilteredUsers)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
                      >
                        <Download size={12} /> Download CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ASSIGNMENTS TAB ── */}
            {activeTab === "assignments" && (
              <div className="space-y-3">
                {filteredAssignments.length === 0 && (
                  <p className="text-center text-gray-500 py-10 font-mono">No assignments submitted yet</p>
                )}
                {filteredAssignments.map((a) => (
                  <div key={a.id} className="bg-gray-900/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{a.title}</span>
                          <span className="font-mono text-xs bg-white/8 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">
                            Week {a.weekNumber}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{a.userName} · {a.userEmail}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                        <div className="flex gap-3 mt-2">
                          {a.githubUrl && (
                            <a href={a.githubUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-mono">GitHub →</a>
                          )}
                          {a.notebookUrl && (
                            <a href={a.notebookUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-mono">Notebook →</a>
                          )}
                          {a.demoUrl && (
                            <a href={a.demoUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-mono">Demo →</a>
                          )}
                        </div>
                      </div>
                      <select
                        value={a.status}
                        onChange={(e) => updateAssignmentStatus(a.id!, e.target.value as Assignment["status"])}
                        className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="approved">Approved ✓</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PROJECTS TAB ── */}
            {activeTab === "projects" && (
              <div className="space-y-3">
                {filteredProjects.length === 0 && (
                  <p className="text-center text-gray-500 py-10 font-mono">No projects submitted yet</p>
                )}
                {filteredProjects.map((p) => (
                  <div key={p.id} className="bg-gray-900/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{p.title}</span>
                          <span className="font-mono text-xs bg-white/8 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">
                            Week {p.weekCompleted}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{p.userName} · {p.userEmail}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                        {p.techStack && p.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.techStack.map((t) => (
                              <span key={t} className="text-xs bg-white/8 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-3 mt-2">
                          {p.githubUrl && (
                            <a href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-mono">GitHub →</a>
                          )}
                          {p.demoUrl && (
                            <a href={p.demoUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-mono">Demo →</a>
                          )}
                        </div>
                      </div>
                      <select
                        value={p.status}
                        onChange={(e) => updateProjectStatus(p.id!, e.target.value as Project["status"])}
                        className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted ⭐</option>
                        <option value="winner">Winner 🏆</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── SESSIONS TAB ── */}
            {activeTab === "sessions" && (
              <div>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <button
                    onClick={() => setEditingSession(null)}
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold text-sm px-4 py-2.5 rounded-xl transition-all font-mono"
                  >
                    <Plus size={16} /> New Session
                  </button>
                  <button
                    onClick={() => handleSeedSessions(false)}
                    className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/15 text-gray-300 font-semibold text-sm px-4 py-2.5 rounded-xl border border-white/10 transition-all font-mono"
                  >
                    <Download size={14} /> Import Default Sessions
                  </button>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("This will overwrite ALL sessions with the default data. Continue?")) {
                          handleSeedSessions(true);
                        }
                      }}
                      className="inline-flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-semibold text-sm px-4 py-2.5 rounded-xl border border-yellow-500/20 transition-all font-mono"
                    >
                      <RefreshCw size={14} /> Re-seed All
                    </button>
                  )}
                  <span className="text-xs text-gray-500 font-mono ml-auto">
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""} total
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <Calendar size={40} className="mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-500 font-mono mb-2">No sessions yet</p>
                    <p className="text-xs text-gray-600">Create one or import the default sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((s) => (
                      <div key={s.id} className="bg-gray-900/50 border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all">
                        <div className="flex flex-wrap items-start gap-4">

                          {/* Session number badge */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm ${
                            s.isKickoff ? "bg-gradient-to-br from-green-500 to-green-700 text-white" :
                            s.isClosing ? "bg-gradient-to-br from-yellow-500 to-yellow-700 text-gray-950" :
                            "bg-white/10 text-white"
                          }`}>
                            <span className="text-[9px] opacity-60">S</span>
                            <span className="text-lg leading-none">{s.number}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Title + badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-white">{s.title}</span>
                              {s.isKickoff && <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">🚀 Kick Off</span>}
                              {s.isClosing && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">🏆 Closing</span>}
                              <span className="text-[10px] bg-white/8 text-gray-500 border border-white/10 px-2 py-0.5 rounded-full font-mono">Week {s.week}</span>
                            </div>

                            {/* Topic */}
                            {s.topic && <p className="text-xs text-green-400 font-semibold mb-1">{s.topic}</p>}

                            {/* Date / time / duration */}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500 font-mono mb-2">
                              {s.date && <span>📅 {s.date}</span>}
                              {s.time && <span>🕕 {s.time}</span>}
                              {s.duration && <span>⏱ {s.duration}</span>}
                            </div>

                            {/* Speaker */}
                            {s.speaker && (
                              <div className="flex items-center gap-2 mb-2">
                                {s.speakerPhoto ? (
                                  <img src={s.speakerPhoto} alt={s.speaker} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-400">
                                    {s.speaker[0]}
                                  </div>
                                )}
                                <span className="text-xs text-gray-300 font-semibold">{s.speaker}</span>
                                {s.speakerTitle && <span className="text-xs text-gray-500">{s.speakerTitle}</span>}
                              </div>
                            )}

                            {/* Tags */}
                            {s.tags && s.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {s.tags.map((t) => (
                                  <span key={t} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">{t}</span>
                                ))}
                              </div>
                            )}

                            {/* What you'll learn */}
                            {s.whatYouWillLearn && s.whatYouWillLearn.length > 0 && (
                              <div className="mt-2">
                                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">You'll learn:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {s.whatYouWillLearn.map((item) => (
                                    <span key={item} className="text-[10px] bg-white/[0.04] text-gray-400 border border-white/8 px-2 py-0.5 rounded-full">▸ {item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Build ideas */}
                            {s.buildIdeas && s.buildIdeas.length > 0 && (
                              <div className="mt-2">
                                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Build:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {s.buildIdeas.map((idea) => (
                                    <span key={idea} className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">💡 {idea}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Video + Drive folder */}
                            {(s.videoUrl || s.resourcesFolderUrl) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {s.videoUrl && (
                                  <a href={s.videoUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full hover:bg-red-500/20 transition-colors">
                                    ▶ Recording
                                  </a>
                                )}
                                {s.resourcesFolderUrl && (
                                  <a href={s.resourcesFolderUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full hover:bg-sky-500/20 transition-colors">
                                    📁 Resources Folder
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Resources */}
                            {s.resources && s.resources.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {s.resources.map((r) => (
                                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full hover:bg-orange-500/20 transition-colors">
                                    <Link size={9} /> {r.title}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingSession(s)}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg font-mono transition-all"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSession(s)}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 border border-white/8 hover:border-red-500/30 px-3 py-1.5 rounded-lg font-mono transition-all"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Session editor modal */}
      {editingSession !== false && (
        <SessionEditor
          session={editingSession}
          onSave={handleSaveSession}
          onClose={() => setEditingSession(false)}
        />
      )}
    </div>
  );
}

