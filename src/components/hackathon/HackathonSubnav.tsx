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
    <nav
      className="hh-nav sticky top-16 z-20 border-b backdrop-blur-md"
      style={{
        borderColor: "#3a2452",
        background: "rgba(12, 7, 18, 0.78)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2.5 items-center">
        {LINKS.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors border ${
                active ? "hh-nav-active" : "border-transparent"
              }`}
              style={
                active
                  ? {
                      background: "rgba(255, 122, 26, 0.2)",
                      color: "#ffb347",
                      borderColor: "rgba(255, 122, 26, 0.5)",
                    }
                  : { color: "#b7a5cf" }
              }
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
          style={{
            fontSize: "0.8rem",
            padding: "0.35rem 0.85rem",
            borderRadius: 999,
            border: "1px solid #ff7a1a",
            color: "#ffb347",
            background: "rgba(255, 122, 26, 0.1)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          🎃 Build lab
        </a>
      </div>
    </nav>
  );
}
