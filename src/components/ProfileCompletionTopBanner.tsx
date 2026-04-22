"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

interface Props {
  pct: number;
  missingLabels: string[];
  /** True when the kick-off bar is above this strip. */
  stackedAfterKickoff?: boolean;
}

/**
 * In-app profile completion nudge; rendered below kick-off (if any) in the top shell.
 */
export default function ProfileCompletionTopBanner({
  pct,
  missingLabels,
  stackedAfterKickoff = false,
}: Props) {
  return (
    <div
      className={`w-full border-b-2 border-amber-500/45 bg-gradient-to-r from-amber-950/95 via-[#1a1008]/95 to-amber-950/95 ring-1 ring-amber-400/25 backdrop-blur-md px-4 py-3.5 sm:py-4 shadow-inner ${
        stackedAfterKickoff ? "border-t-2 border-amber-500/30" : ""
      }`}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 ring-1 ring-amber-400/30">
            <AlertCircle className="h-5 w-5 text-amber-300" aria-hidden />
          </div>
          <div>
            <p className="text-base font-bold text-amber-50 sm:text-lg">
              Complete your profile <span className="font-mono text-amber-200">({pct}%)</span>
            </p>
            <p className="text-sm text-amber-100/90 mt-0.5">
              Still needed: {missingLabels.slice(0, 3).join(", ")}
              {missingLabels.length > 3
                ? ` +${missingLabels.length - 3} more`
                : ""}
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 sm:self-auto font-mono transition-colors"
        >
          Complete profile <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
