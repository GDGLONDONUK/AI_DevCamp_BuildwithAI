"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/hackathon", label: "Overview", exact: true },
  { href: "/hackathon/ideas", label: "Ideas" },
  { href: "/hackathon/prizes", label: "Prizes" },
  { href: "/hackathon/rules", label: "Rules" },
  { href: "/hackathon/my-projects", label: "My project" },
  { href: "/vote", label: "Vote" },
];

const HAUNTED_BUILD = "https://aidevcamp-halloween-hack.vercel.app/build";

export default function HackathonSubnav() {
  const pathname = usePathname();

  return (
    <nav className="hh-nav border-b border-[var(--hh-line)] bg-[rgba(12,7,18,0.65)] backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2 items-center">
        {LINKS.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
                active
                  ? "hh-nav-active border-[rgba(255,122,26,0.45)]"
                  : "border-transparent"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        <a
          href={HAUNTED_BUILD}
          target="_blank"
          rel="noopener noreferrer"
          className="hh-badge shrink-0 ml-auto"
        >
          🎃 Build lab
        </a>
      </div>
    </nav>
  );
}
