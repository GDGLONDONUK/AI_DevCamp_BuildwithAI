"use client";

import type { CodeReviewListItem } from "@/types";

/** Small code review status chip for the admin Projects list. */
export default function CodeReviewBadge({ item }: { item?: CodeReviewListItem }) {
  if (!item) return null;

  const base = "text-[10px] font-mono uppercase px-2 py-0.5 rounded border";
  if (item.status === "queued" || item.status === "running") {
    return <span className={`${base} bg-sky-500/10 text-sky-300 border-sky-500/30`}>Reviewing</span>;
  }
  if (item.status === "failed" && !item.lookCloser.length) {
    return <span className={`${base} bg-red-500/10 text-red-300 border-red-500/30`}>Review failed</span>;
  }

  const notAdk = item.agentKind && item.agentKind !== "adk-agent";
  const reasons = [...item.lookCloser, ...(notAdk ? ["Not an ADK agent"] : [])];
  if (reasons.length > 0) {
    return (
      <span className={`${base} bg-amber-500/15 text-amber-300 border-amber-500/30`} title={reasons.join(" · ")}>
        Look closer · {reasons[0]}
        {reasons.length > 1 ? ` +${reasons.length - 1}` : ""}
      </span>
    );
  }
  return <span className={`${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/30`}>Review ready</span>;
}
