"use client";

import { useState, useEffect } from "react";
import type { Speaker } from "@/types";
import { getSpeakers } from "@/lib/speakerService";

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSpeakers()
      .then((data) => {
        if (!cancelled) setSpeakers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load speakers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { speakers, loading, error };
}
