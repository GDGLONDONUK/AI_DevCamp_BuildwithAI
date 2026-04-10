"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { UserStatus } from "@/types";

export const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending:          { label: "Pending",       bg: "bg-gray-500/20",   text: "text-gray-400",   dot: "bg-gray-400"   },
  participated:     { label: "Participated",  bg: "bg-blue-500/20",   text: "text-blue-400",   dot: "bg-blue-400"   },
  certified:        { label: "Certified ✓",  bg: "bg-green-500/20",  text: "text-green-400",  dot: "bg-green-400"  },
  "not-certified":  { label: "Not Certified", bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400" },
  failed:           { label: "Failed",        bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-400"    },
};

export const ALL_STATUSES: UserStatus[] = [
  "pending", "participated", "certified", "not-certified", "failed",
];

interface Props {
  status: UserStatus;
  onChange: (s: UserStatus) => void;
}

export default function StatusDropdown({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-mono border transition-all ${sc.bg} ${sc.text} border-current/30`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        {sc.label}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 min-w-[160px]">
            {ALL_STATUSES.map((s) => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm font-mono transition-colors hover:bg-white/5 ${
                    s === status ? c.text + " font-bold" : "text-gray-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                  {c.label}
                  {s === status && <CheckCircle2 size={12} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
