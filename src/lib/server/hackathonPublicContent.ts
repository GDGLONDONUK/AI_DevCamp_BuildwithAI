import { adminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_HACKATHON_PUBLIC_CONTENT,
  normalizeHackathonPublicContent,
  type HackathonPublicContent,
} from "@/lib/hackathonContent";

const TTL_MS = 60_000;

type CacheEntry = { data: HackathonPublicContent; expiresAt: number };

let memoryCache: CacheEntry | null = null;

export function invalidateHackathonPublicContentCache(): void {
  memoryCache = null;
}

/** Public marketing copy from `hackathonSettings/main` (server-only collection). */
export async function loadHackathonPublicContent(): Promise<HackathonPublicContent> {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    return memoryCache.data;
  }

  try {
    const snap = await adminDb().collection("hackathonSettings").doc("main").get();
    const data = normalizeHackathonPublicContent(snap.exists ? snap.data() : undefined);
    memoryCache = { data, expiresAt: now + TTL_MS };
    return data;
  } catch {
    if (memoryCache) return memoryCache.data;
    return { ...DEFAULT_HACKATHON_PUBLIC_CONTENT };
  }
}
