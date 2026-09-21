"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_HOME_SITE_CONTENT,
  type HomeSiteContent,
} from "@/lib/siteContent";
import { fetchHomeSiteContent } from "@/lib/siteContentApi";

const CACHE_KEY = "aidevcamp.siteContent.home.v1";
const CACHE_TTL_MS = 5 * 60_000;

type Cached = { data: HomeSiteContent; expiresAt: number };

function readLocalCache(): HomeSiteContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.data || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeLocalCache(data: HomeSiteContent): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function useSiteContent() {
  const [content, setContent] = useState<HomeSiteContent>(() => {
    return readLocalCache() ?? { ...DEFAULT_HOME_SITE_CONTENT };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchHomeSiteContent()
      .then((data) => {
        if (cancelled) return;
        setContent(data);
        writeLocalCache(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, loading };
}
