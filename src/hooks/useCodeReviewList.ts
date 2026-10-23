"use client";

import { useEffect, useState } from "react";
import type { CodeReviewListItem } from "@/types";
import { fetchCodeReviewList } from "@/lib/codeReviewApi";

/**
 * Code review status for every project, keyed by projectId. Polls while `enabled`
 * (the Projects tab is open): every 20s while reviews are running, otherwise every minute.
 * Each poll also nudges the server to work through waiting reviews.
 */
export function useCodeReviewList(enabled: boolean): Record<string, CodeReviewListItem> {
  const [byId, setById] = useState<Record<string, CodeReviewListItem>>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      let busy = false;
      try {
        const items = await fetchCodeReviewList();
        if (cancelled) return;
        busy = items.some((i) => i.status === "queued" || i.status === "running");
        setById(Object.fromEntries(items.map((i) => [i.projectId, i])));
      } catch {
        // Keep the last known statuses; try again next tick.
      }
      if (!cancelled) timer = window.setTimeout(tick, busy ? 20_000 : 60_000);
    };
    void tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return byId;
}
