/** Public Google Photos share link only — never photos.google.com/u/… (signed-in user). */

export const PUBLIC_HACKATHON_PHOTOS_ALBUM_URL =
  "https://photos.app.goo.gl/18M2dwzb5BXbXhTj9";

export const PUBLIC_HACKATHON_PHOTOS_ALBUM_TITLE =
  "AI DevCamp 2026 · Halloween Hack · 31 Oct";

export type GooglePhotosPreview = {
  albumUrl: string;
  title: string;
  thumbs: string[];
};

const GOO_GL_HOST = "photos.app.goo.gl";
const PHOTOS_HOST = "photos.google.com";
const LH3 = "https://lh3.googleusercontent.com/pw/";

export function isPublicGooglePhotosAlbumUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    if (u.hostname === GOO_GL_HOST) {
      return /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
    }
    if (u.hostname === PHOTOS_HOST) {
      if (u.pathname.includes("/u/")) return false;
      return u.pathname.startsWith("/share/") || u.pathname.startsWith("/album/");
    }
    return false;
  } catch {
    return false;
  }
}

export function googlePhotosThumbUrl(photoId: string, size = 800): string {
  return `${LH3}${photoId}=w${size}-h${size}-c`;
}

export function parseGooglePhotosShareHtml(html: string): {
  title: string | null;
  photoIds: string[];
  ogImage: string | null;
} {
  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    )?.[1] ||
    null;
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] || null;

  const ids: string[] = [];
  const seen = new Set<string>();
  const re = /https:\/\/lh3\.googleusercontent\.com\/pw\/([A-Za-z0-9_-]{20,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && ids.length < 24) {
    const id = m[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  const safeOg =
    ogImage &&
    (ogImage.startsWith("https://lh3.googleusercontent.com/") ||
      ogImage.startsWith("https://lh3.google.com/"))
      ? ogImage
      : null;

  return {
    title: ogTitle ? ogTitle.replace(/\s+-\s+Google Photos$/i, "").trim() : null,
    photoIds: ids,
    ogImage: safeOg,
  };
}
