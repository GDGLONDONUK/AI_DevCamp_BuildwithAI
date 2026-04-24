"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export default function CopyTextButton({
  text,
  label = "Copy to clipboard",
  disabled,
  className,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const t = text.trim();
    if (!t) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }, [text]);

  const empty = !text.trim();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copy();
      }}
      disabled={disabled ?? empty}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1 text-gray-500 hover:text-white hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35 transition-colors",
        className
      )}
    >
      {copied ? <Check size={14} className="text-green-400" strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
    </button>
  );
}
