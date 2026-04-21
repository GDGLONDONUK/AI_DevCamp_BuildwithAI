"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { calcProfileCompletion } from "@/lib/profileCompletion";

export default function AuthenticatedMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const pathname = usePathname();

  const excludedPath =
    pathname.startsWith("/register") || pathname === "/profile";

  let showBanner = false;
  let pct = 100;
  let missingLabels: string[] = [];

  if (!loading && user && userProfile && !excludedPath) {
    const c = calcProfileCompletion(userProfile);
    if (c.pct < 100) {
      showBanner = true;
      pct = c.pct;
      missingLabels = c.missing.map((f) => f.label);
    }
  }

  return (
    <>
      {showBanner && (
        <div
          className="fixed top-16 left-0 right-0 z-[35] border-b border-amber-500/35 bg-amber-950/95 backdrop-blur-md px-4 py-2.5 shadow-lg shadow-black/25"
          role="status"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-2 sm:items-center">
              <AlertCircle
                className="h-5 w-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0"
                aria-hidden
              />
              <p className="text-sm text-amber-50">
                <span className="font-semibold">Your profile is incomplete ({pct}%)</span>
                <span className="text-amber-100/90">
                  {" "}
                  — still needed:{" "}
                  {missingLabels.slice(0, 3).join(", ")}
                  {missingLabels.length > 3
                    ? ` +${missingLabels.length - 3} more`
                    : ""}
                </span>
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-gray-950 hover:bg-amber-400 sm:self-auto sm:py-1.5 font-mono"
            >
              Complete profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
      <main className={showBanner ? "pt-28" : "pt-16"}>{children}</main>
    </>
  );
}
