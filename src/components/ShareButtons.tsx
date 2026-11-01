"use client";

import { useState } from "react";
import { linkedinShareUrl, xShareUrl } from "@/lib/linkedinShare";
import { Check, Copy } from "lucide-react";
import { LinkedinIcon } from "@/components/icons/SocialBrandIcons";

export default function ShareButtons(props: {
  url: string;
  text: string;
  linkedinAddUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={linkedinShareUrl(props.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
      >
        <LinkedinIcon size={16} />
        Share on LinkedIn
      </a>
      {props.linkedinAddUrl ? (
        <a
          href={props.linkedinAddUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
        >
          Add to LinkedIn profile
        </a>
      ) : null}
      <a
        href={xShareUrl(props.text, props.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Share on X
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(props.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
