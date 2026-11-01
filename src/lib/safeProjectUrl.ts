const TOKEN_RE = /\b(ghp_|github_pat_|gho_|ghu_|ghs_|AIza|sk-|sk-ant-|dcmcp_)/i;

const ALLOWED_HOSTS = new Set([
  "github.com",
  "www.github.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "loom.com",
  "www.loom.com",
  "drive.google.com",
  "docs.google.com",
]);

const ALLOWED_HOST_SUFFIXES = [
  ".vercel.app",
  ".web.app",
  ".firebaseapp.com",
  ".run.app",
  ".netlify.app",
  ".github.io",
];

export function urlLooksLikeSecret(raw: string): boolean {
  return TOKEN_RE.test(raw);
}

export function isAllowedProjectHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((sfx) => host.endsWith(sfx));
}

/** Public-safe https URL, or null if missing / token-like / not allow-listed. */
export function sanitizePublicProjectUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (urlLooksLikeSecret(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (urlLooksLikeSecret(parsed.href) || urlLooksLikeSecret(parsed.username + parsed.password)) {
    return null;
  }
  if (!isAllowedProjectHost(parsed.hostname)) return null;
  return parsed.href;
}

export function assertSafeProjectSubmitUrl(raw: string, field: string): void {
  const t = raw.trim();
  if (!t) return;
  if (urlLooksLikeSecret(t)) {
    throw new Error(`${field} looks like a secret/token — paste a normal https link instead`);
  }
  if (sanitizePublicProjectUrl(t) == null) {
    throw new Error(
      `${field} must be an https URL on GitHub, YouTube, Loom, Google Drive, Vercel, Firebase, Cloud Run, Netlify, or GitHub Pages`
    );
  }
}
