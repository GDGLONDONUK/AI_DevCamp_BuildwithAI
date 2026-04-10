"use client";

import { useState, useEffect } from "react";
import { Session } from "@/types";
import { getSessions } from "@/lib/sessionService";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setError("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  return { sessions, loading, error };
}
