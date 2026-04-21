"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * When URL is `/?login=1` (e.g. from /register) opens login; `&reset=1` opens in password-reset mode.
 */
export default function OpenLoginFromQuery({
  onOpen,
}: {
  onOpen: (options: { forgot: boolean }) => void;
}) {
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (searchParams.get("login") !== "1") return;
    handled.current = true;
    onOpen({ forgot: searchParams.get("reset") === "1" });
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.delete("login");
      u.searchParams.delete("reset");
      const next = u.pathname + (u.search || "") + u.hash;
      window.history.replaceState(null, "", next || "/");
    }
  }, [searchParams, onOpen]);

  return null;
}
