/** Lightweight UX cookie for Edge proxy — not a security boundary. */

const COOKIE_NAME = "firebase-session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

function cookieFlags(): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `; path=/; SameSite=Lax${secure}`;
}

export function setFirebaseSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=1; Max-Age=${MAX_AGE_SEC}${cookieFlags()}`;
}

export function clearFirebaseSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0${cookieFlags()}`;
}
