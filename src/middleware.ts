/**
 * Next.js Edge Middleware — first layer of route protection.
 *
 * NOTE: Firebase client-side auth uses short-lived ID tokens stored in
 * IndexedDB, which are not available at the Edge. This middleware is therefore
 * a UX guard (prevents the admin page from even loading for unauthenticated
 * users) — not a security boundary. The real security enforcement is in
 * Firestore security rules which run server-side at Firebase.
 *
 * For full server-side enforcement with Firebase, use the Firebase Admin SDK
 * in a Next.js Route Handler or Server Action, verifying the ID token from a
 * cookie. That is out of scope for this client-rendered app.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require the user to be signed in.
const PROTECTED_ROUTES = ["/dashboard", "/submit", "/profile"];

// Routes that require admin role — we can only fully enforce in Firestore rules,
// but we can redirect immediately if no session cookie exists at all.
const ADMIN_ROUTES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Firebase sets a session indicator we can use as a lightweight hint.
  // The actual auth state is managed client-side; this cookie check is a
  // UX shortcut to redirect obviously unauthenticated requests.
  const hasSession = request.cookies.has("firebase-session");

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if ((isProtected || isAdmin) && !hasSession) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/submit/:path*", "/profile/:path*", "/admin/:path*"],
};
