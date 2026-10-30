"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setFirebaseSessionCookie } from "@/lib/firebaseSessionCookie";
import {
  consumePostLoginRedirect,
  parseRedirectParam,
  rememberPostLoginRedirect,
} from "@/lib/postLoginRedirect";

/**
 * `/?login=1` opens the sign-in modal. `/?redirect=/path` (set by the Edge proxy
 * when a protected page is hit without the session cookie) is followed once the
 * user is signed in — including if they were already signed in via Firebase.
 */
export default function OpenLoginFromQuery({
  onOpen,
}: {
  onOpen: (options: { forgot: boolean }) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const openedLogin = useRef(false);
  const navigated = useRef(false);

  useEffect(() => {
    const fromQuery = parseRedirectParam(searchParams.get("redirect"));
    if (fromQuery) rememberPostLoginRedirect(fromQuery);

    if (loading) return;

    if (user) {
      setFirebaseSessionCookie();
      // Follow ?redirect= immediately. Also consume a recent stored dest after
      // Google returns to `/` with the query stripped.
      const stored = fromQuery ? null : consumePostLoginRedirect();
      const target = fromQuery || stored;
      if (target && !navigated.current) {
        navigated.current = true;
        if (fromQuery) consumePostLoginRedirect();
        router.replace(target);
      }
      return;
    }

    const wantLogin = searchParams.get("login") === "1" || Boolean(fromQuery);
    if (!wantLogin || openedLogin.current) return;
    openedLogin.current = true;
    onOpen({ forgot: searchParams.get("reset") === "1" });

    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.delete("login");
      u.searchParams.delete("reset");
      const next = u.pathname + (u.search || "") + u.hash;
      window.history.replaceState(null, "", next || "/");
    }
  }, [searchParams, onOpen, user, loading, router]);

  return null;
}
