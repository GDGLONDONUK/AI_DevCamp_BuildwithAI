"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SESSIONS } from "@/data/sessions";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Assignment, Project } from "@/types";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Upload,
  CheckCircle2,
  Clock,
  BookOpen,
  Code2,
  ArrowRight,
  User,
  XCircle,
} from "lucide-react";
import ProfileCompletion from "@/components/ui/ProfileCompletion";
import ProgramOptOutControl from "@/components/ProgramOptOutControl";

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [asnSnap, projSnap, attSnap] = await Promise.all([
          getDocs(query(
            collection(db, "assignments"),
            where("userId", "==", user.uid),
            orderBy("submittedAt", "desc")
          )),
          getDocs(query(
            collection(db, "projects"),
            where("userId", "==", user.uid),
            orderBy("submittedAt", "desc")
          )),
          getDoc(doc(db, "attendance", user.uid)),
        ]);
        setAssignments(asnSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment)));
        setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
        if (attSnap.exists()) setAttendance(attSnap.data() as Record<string, boolean>);
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const attendedSessions = SESSIONS.filter((s) => attendance[s.id] === true);
  const completedWeeks = [...new Set(assignments.map((a) => a.weekNumber))];
  const progress = Math.round((attendedSessions.length / SESSIONS.length) * 100);

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6">
          <div className="flex-shrink-0">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="Avatar"
                width={56}
                height={56}
                className="rounded-full ring-2 ring-green-500/40"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xl font-bold">
                {(userProfile?.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              Welcome back, {userProfile?.displayName || "Attendee"}! 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
          </div>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
          >
            <Upload size={15} />
            Submit Work
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Sessions Attended",
              value: attendedSessions.length,
              total: SESSIONS.length,
              icon: Calendar,
              color: "text-blue-400",
            },
            {
              label: "Assignments Submitted",
              value: assignments.length,
              total: 3,
              icon: BookOpen,
              color: "text-purple-400",
            },
            {
              label: "Projects Submitted",
              value: projects.length,
              total: 1,
              icon: Code2,
              color: "text-green-400",
            },
            {
              label: "Attendance Rate",
              value: `${progress}%`,
              icon: CheckCircle2,
              color: "text-orange-400",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-gray-900 border border-white/10 rounded-xl p-4"
            >
              <Icon size={18} className={`${color} mb-2`} />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Profile completion card */}
        <ProfileCompletion profile={userProfile} variant="compact" />

        <ProgramOptOutControl variant="dashboard" />

        <div className="grid lg:grid-cols-2 gap-6">

          {/* My Attendance */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-green-400" />
                My Attendance
              </h2>
              <Link
                href="/sessions"
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                View sessions <ArrowRight size={12} />
              </Link>
            </div>

            {dataLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {SESSIONS.map((s) => {
                  const attended = attendance[s.id] === true;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                        attended
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-white/[0.02] border-white/5"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        attended
                          ? "bg-green-500/30 text-green-300"
                          : "bg-white/5 text-gray-500"
                      }`}>
                        {s.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <p className={`text-sm font-medium truncate ${attended ? "text-white" : "text-gray-500"}`}>
                            {s.title}
                          </p>
                          {attended && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-green-500/35 bg-green-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-green-300 flex-shrink-0"
                              title="Recorded as attended by the organising team"
                            >
                              <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" aria-hidden />
                              Attended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{s.date}</p>
                      </div>
                      {!attended && <XCircle size={16} className="text-gray-700 flex-shrink-0" aria-hidden />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submissions */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Upload size={18} className="text-purple-400" />
                My Submissions
              </h2>
              <Link
                href="/submit"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                Submit <ArrowRight size={12} />
              </Link>
            </div>
            {dataLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : assignments.length === 0 && projects.length === 0 ? (
              <div className="text-center py-8">
                <Upload size={36} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">No submissions yet</p>
                <Link
                  href="/submit"
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Submit your first work →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[...assignments.slice(0, 3), ...projects.slice(0, 2)].map(
                  (item, i) => {
                    const isProject = "techStack" in item;
                    return (
                      <div
                        key={item.id || i}
                        className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-3"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            isProject
                              ? "bg-green-500/20 text-green-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {isProject ? <Code2 size={16} /> : <BookOpen size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {isProject
                              ? "Project"
                              : `Week ${"weekNumber" in item ? item.weekNumber : ""} Assignment`}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            item.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : item.status === "reviewed"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* Week progress */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-orange-400" />
            Assignment Progress
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((week) => {
              const done = completedWeeks.includes(week);
              return (
                <div
                  key={week}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    done
                      ? "border-green-500/40 bg-green-500/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div
                    className={`text-2xl font-bold mb-1 ${done ? "text-green-400" : "text-gray-600"}`}
                  >
                    {done ? "✓" : week}
                  </div>
                  <div className="text-xs text-gray-400">Week {week}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {done ? "Submitted" : "Pending"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile reminder */}
        {!userProfile?.bio && (
          <div className="flex items-start gap-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
            <User size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Complete your profile</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Add a bio and social links so mentors can get to know you better.
              </p>
            </div>
            <Link
              href="/profile"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
            >
              Edit Profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
