import { adminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_HOME_SITE_CONTENT,
  HOME_SITE_CONTENT_DOC_ID,
  SITE_CONTENT_COLLECTION,
  normalizeHomeSiteContent,
  type HomeSiteContent,
} from "@/lib/siteContent";

const TTL_MS = 60_000;

type CacheEntry = { data: HomeSiteContent; expiresAt: number };

let memoryCache: CacheEntry | null = null;

export function invalidateHomeSiteContentCache(): void {
  memoryCache = null;
}

export async function loadHomeSiteContent(): Promise<HomeSiteContent> {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    return memoryCache.data;
  }

  try {
    const snap = await adminDb()
      .collection(SITE_CONTENT_COLLECTION)
      .doc(HOME_SITE_CONTENT_DOC_ID)
      .get();

    const data = snap.exists
      ? normalizeHomeSiteContent(snap.data())
      : { ...DEFAULT_HOME_SITE_CONTENT };

    memoryCache = { data, expiresAt: now + TTL_MS };
    return data;
  } catch {
    if (memoryCache) return memoryCache.data;
    return { ...DEFAULT_HOME_SITE_CONTENT };
  }
}

export async function saveHomeSiteContent(
  content: HomeSiteContent,
  updatedByUid: string
): Promise<HomeSiteContent> {
  const normalized = normalizeHomeSiteContent(content);
  const updatedAt = new Date().toISOString();
  const payload = {
    ...normalized,
    updatedAt,
    updatedByUid,
  };

  await adminDb()
    .collection(SITE_CONTENT_COLLECTION)
    .doc(HOME_SITE_CONTENT_DOC_ID)
    .set(payload, { merge: true });

  invalidateHomeSiteContentCache();
  const saved = normalizeHomeSiteContent(payload);
  memoryCache = { data: saved, expiresAt: Date.now() + TTL_MS };
  return saved;
}
