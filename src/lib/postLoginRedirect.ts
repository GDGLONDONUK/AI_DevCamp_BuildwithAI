/** sessionStorage key for destination after login (survives Google redirect). */
export const POST_LOGIN_REDIRECT_KEY = "devcamp:post-login-redirect";
const MAX_AGE_MS = 30 * 60 * 1000;

function pathWithoutQuery(path: string): string {
  return path.split("?")[0] || path;
}

/** Relative app path only — blocks open redirects (`//`, `https:`, `/api`). */
export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("://") || path.includes("\\")) return false;
  const pathname = pathWithoutQuery(path);
  if (pathname.startsWith("/api")) return false;
  if (pathname.length > 300) return false;
  return true;
}

export function parseRedirectParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep raw */
  }
  value = value.split("#")[0]?.trim() || "";
  if (!isSafeInternalPath(value)) return null;
  return value;
}

export function rememberPostLoginRedirect(path: string): void {
  if (typeof window === "undefined") return;
  if (!isSafeInternalPath(path)) return;
  try {
    sessionStorage.setItem(
      POST_LOGIN_REDIRECT_KEY,
      JSON.stringify({ path, at: Date.now() })
    );
  } catch {
    /* private mode */
  }
}

export function peekPostLoginRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (!raw) return null;
    if (raw.startsWith("/")) {
      return isSafeInternalPath(raw) ? raw : null;
    }
    const parsed = JSON.parse(raw) as { path?: string; at?: number };
    if (typeof parsed.at === "number" && Date.now() - parsed.at > MAX_AGE_MS) {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      return null;
    }
    return parsed.path && isSafeInternalPath(parsed.path) ? parsed.path : null;
  } catch {
    return null;
  }
}

export function consumePostLoginRedirect(): string | null {
  const stored = peekPostLoginRedirect();
  if (!stored) return null;
  try {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
  return stored;
}

export function loginUrlWithRedirect(path: string): string {
  const safe = isSafeInternalPath(path) ? path : "/";
  return `/?login=1&redirect=${encodeURIComponent(safe)}`;
}
