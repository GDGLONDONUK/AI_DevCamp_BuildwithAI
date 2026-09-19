"use client";

import { useState, useEffect } from "react";
import { Session } from "@/types";
import { getSessionsForActiveCohort, getSessionsForCohort } from "@/lib/sessionService";
import { getActiveCohortId } from "@/lib/cohorts";

export function useSessions(cohortId?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolved = cohortId || getActiveCohortId();

  useEffect(() => {
    let cancelled = false;
    const load = cohortId
      ? getSessionsForCohort(cohortId)
      : getSessionsForActiveCohort();
    load
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load sessions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolved, cohortId]);

  return { sessions, loading, error, cohortId: resolved };
}
