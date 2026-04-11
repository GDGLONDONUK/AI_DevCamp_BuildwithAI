/**
 * Next.js 16 Edge Proxy — first layer of route protection.
 *
 * NOTE: Firebase client-side auth uses short-lived ID tokens stored in
 * IndexedDB, which are not available at the Edge. This proxy is therefore
 * a UX guard (prevents protected pages from loading for unauthenticated
 * users) — not a security boundary. The real security enforcement is in
 * Firestore security rules which run server-side at Firebase.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/submit", "/profile"];
const ADMIN_ROUTES = ["/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
