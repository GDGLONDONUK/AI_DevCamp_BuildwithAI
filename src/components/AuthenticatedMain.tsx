"use client";

import { usePathname } from "next/navigation";
import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { calcProfileCompletion } from "@/lib/profileCompletion";
import { userNeedsKickoffRsvp } from "@/lib/kickoffRsvp";
import KickoffRsvpBanner from "@/components/KickoffRsvpBanner";
import ProfileCompletionTopBanner from "@/components/ProfileCompletionTopBanner";

const NAV_PX = 64;

export default function AuthenticatedMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const pathname = usePathname();
  const topShellRef = useRef<HTMLDivElement>(null);
  const [mainPaddingTop, setMainPaddingTop] = useState(NAV_PX);

  const onKickoffPage = pathname.startsWith("/register/kickoff");
  const showKickoffGate =
    !loading &&
    Boolean(user && userProfile && userNeedsKickoffRsvp(userProfile)) &&
    !onKickoffPage;

  const profileExcludedPath = pathname.startsWith("/register");

  let showProfileBanner = false;
  let pct = 100;
  let missingLabels: string[] = [];

  if (!loading && user && userProfile && !profileExcludedPath) {
    const c = calcProfileCompletion(userProfile);
    if (c.pct < 100) {
      showProfileBanner = true;
      pct = c.pct;
      missingLabels = c.missing.map((f) => f.label);
    }
  }

  const showTopShell = showKickoffGate || showProfileBanner;

  const updateMainPadding = useCallback(() => {
    const el = topShellRef.current;
    if (!el || !showTopShell) {
      setMainPaddingTop(NAV_PX);
      return;
    }
    setMainPaddingTop(NAV_PX + el.offsetHeight);
  }, [showTopShell]);

  useLayoutEffect(() => {
    updateMainPadding();
  }, [updateMainPadding, showKickoffGate, showProfileBanner, pathname]);

  useLayoutEffect(() => {
    if (!showTopShell || !topShellRef.current) return;
    const el = topShellRef.current;
    const ro = new ResizeObserver(() => updateMainPadding());
    ro.observe(el);
    return () => ro.disconnect();
  }, [showTopShell, updateMainPadding]);

  return (
    <>
      {showTopShell && (
        <div
          ref={topShellRef}
          className="fixed top-16 left-0 right-0 z-30 flex flex-col shadow-2xl shadow-black/30"
        >
          {showKickoffGate && <KickoffRsvpBanner />}
          {showProfileBanner && (
            <ProfileCompletionTopBanner
              pct={pct}
              missingLabels={missingLabels}
              stackedAfterKickoff={showKickoffGate}
            />
          )}
        </div>
      )}
      <main
        className="min-h-0"
        style={{ paddingTop: mainPaddingTop }}
      >
        {children}
      </main>
    </>
  );
}
