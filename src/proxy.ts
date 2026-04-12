/**
 * Next.js 16 Edge Proxy
 *
 * Responsibilities (in order):
 *  1. CORS  — allow requests only from trusted origins; block everything else
 *  2. Route protection — redirect unauthenticated users from protected pages
 *  3. Security headers — applied to every response
 *
 * NOTE: Firebase client-side auth stores sessions in IndexedDB, not cookies.
 * We set a lightweight `firebase-session` cookie in AuthContext so the proxy
 * can detect auth state at the Edge. This is a UX guard, not a security
 * boundary — real access control is enforced by Firestore security rules.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Trusted origins ─────────────────────────────────────────────────────────
// Add your production domain via NEXT_PUBLIC_SITE_URL in .env.local / Vercel env vars.
// All origins listed here are allowed to make cross-origin requests to this app.
const ALLOWED_ORIGINS: string[] = [
  process.env.NEXT_PUBLIC_SITE_URL,                       // e.g. https://yourapp.com
  "https://buildwithai-gdglondon.web.app",                // Firebase Hosting primary
  "https://buildwithai-gdglondon.firebaseapp.com",        // Firebase Hosting secondary
  "http://localhost:3000",                                 // Local dev
  "http://localhost:3001",                                 // Local dev (alt port)
].filter(Boolean) as string[];

// ── Route protection ─────────────────────────────────────────────────────────
const PROTECTED_ROUTES = ["/dashboard", "/submit", "/profile"];
const ADMIN_ROUTES     = ["/admin"];

// ── Security response headers ─────────────────────────────────────────────────
// Applied to every response regardless of origin or route.
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent the page from being embedded in an iframe (clickjacking protection)
  "X-Frame-Options":           "DENY",
  // Stop browsers from MIME-sniffing a response away from the declared content-type
  "X-Content-Type-Options":    "nosniff",
  // Enable browser's built-in XSS filter
  "X-XSS-Protection":          "1; mode=block",
  // Control how much referrer info is sent with requests
  "Referrer-Policy":           "strict-origin-when-cross-origin",
  // Restrict access to browser features
  "Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
  // Force HTTPS for 2 years (only effective on HTTPS deployments)
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

// ── Main proxy function ───────────────────────────────────────────────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // ── 1. CORS ──────────────────────────────────────────────────────────────
  // Regular browser page navigations don't include an Origin header — they
  // pass through freely. Only cross-origin fetch/XHR requests have one.
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    // Respond to CORS preflight (OPTIONS) requests
    if (request.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: isAllowed ? 204 : 403 });
      if (isAllowed) {
        preflight.headers.set("Access-Control-Allow-Origin",  origin);
        preflight.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        preflight.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        preflight.headers.set("Access-Control-Max-Age",       "86400");
      }
      return applySecurityHeaders(preflight);
    }

    // Block cross-origin requests from unknown origins
    if (!isAllowed) {
      return applySecurityHeaders(
        new NextResponse(
          JSON.stringify({ error: "Origin not allowed" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      );
    }
  }

  // ── 2. Route protection ───────────────────────────────────────────────────
  const hasSession  = request.cookies.has("firebase-session");
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if ((isProtected || isAdmin) && !hasSession) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ── 3. Pass through with security headers + CORS allow header ────────────
  const response = NextResponse.next();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  return applySecurityHeaders(response);
}

// Apply proxy to all routes except Next.js internals and static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpeg$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)",
  ],
};
