import {
  isPublicGooglePhotosAlbumUrl,
  parseGooglePhotosShareHtml,
  googlePhotosThumbUrl,
  type GooglePhotosPreview,
} from "@/lib/googlePhotosAlbum";

export type { GooglePhotosPreview };

const TTL_MS = 10 * 60_000;

type CacheEntry = { data: GooglePhotosPreview; expiresAt: number };

const cache = new Map<string, CacheEntry>();

async function fetchAlbumHtml(albumUrl: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(albumUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const finalHost = new URL(res.url).hostname;
    if (
      finalHost !== "photos.app.goo.gl" &&
      finalHost !== "photos.google.com" &&
      !finalHost.endsWith(".google.com")
    ) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Preview thumbs from a public share link. Fail closed to CTA-only (empty thumbs). */
export async function loadGooglePhotosPreview(
  albumUrl: string,
  titleFallback: string
): Promise<GooglePhotosPreview> {
  const empty: GooglePhotosPreview = { albumUrl, title: titleFallback, thumbs: [] };
  if (!isPublicGooglePhotosAlbumUrl(albumUrl)) return empty;

  const now = Date.now();
  const hit = cache.get(albumUrl);
  if (hit && now < hit.expiresAt) return hit.data;

  const html = await fetchAlbumHtml(albumUrl);
  if (!html) {
    cache.set(albumUrl, { data: empty, expiresAt: now + 60_000 });
    return empty;
  }

  const parsed = parseGooglePhotosShareHtml(html);
  const thumbs = parsed.photoIds.map((id) => googlePhotosThumbUrl(id, 800));
  if (parsed.ogImage && thumbs.length === 0) {
    thumbs.push(parsed.ogImage);
  }

  const data: GooglePhotosPreview = {
    albumUrl,
    title: parsed.title || titleFallback,
    thumbs: thumbs.slice(0, 12),
  };
  cache.set(albumUrl, { data, expiresAt: now + TTL_MS });
  return data;
}
