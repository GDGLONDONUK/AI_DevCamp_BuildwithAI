import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { loadSeptemberGraduates } from "@/lib/server/publicCertified";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "AI DevCamp — September 2026 Graduates",
  description:
    "Certified attendees of AI DevCamp September 2026 (Build → Scale → Govern → Optimise). Certified for attending at least 60% of the programme.",
};

export default async function CertifiedPage() {
  const graduates = await loadSeptemberGraduates();

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-4 text-center">
          <p className="font-mono text-sm tracking-widest text-green-400">GDG LONDON</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            AI DevCamp — September 2026 Graduates
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            A 4-week hands-on programme: Build → Scale → Govern → Optimise, with Google ADK.
            Certified for attending at least 60% of the programme.
          </p>
          <p>
            <Link
              href="/hackathon/devcamp-september-2026/winners"
              className="text-amber-300 hover:underline"
            >
              Hackathon winners
            </Link>
          </p>
        </header>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {graduates.map((g, i) => (
            <li
              key={g.shareId || `${g.name}-${i}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex gap-3"
            >
              {g.photoURL ? (
                <Image
                  src={g.photoURL}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover h-12 w-12"
                />
              ) : (
                <div
                  aria-hidden
                  className="h-12 w-12 rounded-full bg-green-700/40 flex items-center justify-center text-green-200 font-bold"
                >
                  {g.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                {g.shareId ? (
                  <Link href={`/certificate/${g.shareId}`} className="font-semibold hover:text-green-300 block truncate">
                    {g.name}
                  </Link>
                ) : (
                  <p className="font-semibold truncate">{g.name}</p>
                )}
                {g.awardLabel && g.projectPermalink ? (
                  <Link href={g.projectPermalink} className="text-xs text-amber-300 hover:underline">
                    {g.awardLabel}
                    {g.projectTitle ? ` · ${g.projectTitle}` : ""}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
