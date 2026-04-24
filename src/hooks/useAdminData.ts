"use client";

import { useState, useCallback } from "react";
import { Assignment, Project, UserProfile } from "@/types";
import { Session } from "@/types";
import {
  fetchAllUsers, fetchAllAssignments, fetchAllProjects,
  fetchAttendanceForUsers,
} from "@/lib/adminService";
import { getSessions } from "@/lib/sessionService";

export interface AdminData {
  users: UserProfile[];
  assignments: Assignment[];
  projects: Project[];
  sessions: Session[];
  attendance: Record<string, Record<string, boolean | string>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminData(): AdminData {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean | string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
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

      const att = await fetchAttendanceForUsers(loadedUsers.map((u) => u.uid));
      setAttendance(att);
    } catch {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger on mount
  useState(() => { refresh(); });

  return { users, assignments, projects, sessions, attendance, loading, error, refresh };
}
