import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { loadPublicWinners } from "@/lib/server/publicWinners";
import WinnerCard from "@/components/hackathon/WinnerCard";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "AI DevCamp 2026 Agentic Hackathon — Winners",
  description:
    "Winners of the AI DevCamp 2026 Agentic Hackathon at Encode Hub, London and online. 30 projects built with Google ADK in one day.",
};

export default async function HackathonWinnersPage({
  params,
}: {
  params: Promise<{ hackathonId: string }>;
}) {
  const { hackathonId } = await params;
  if (hackathonId !== DEVCAMP_HACKATHON_ID) notFound();

  const { winners, gallery } = await loadPublicWinners(hackathonId);
  const podium = winners.filter((w) =>
    ["first-online", "first-in-person", "second", "third", "peoples-choice"].includes(w.award)
  );
  const ranked = winners.filter((w) => w.award === "finalist");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">
      <header className="text-center space-y-3">
        <p className="font-mono text-sm tracking-widest text-amber-300">31 OCT 2026</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
          AI DevCamp 2026 Agentic Hackathon — Winners
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Encode Hub, London + online. 30 projects built with Google ADK in one day.
        </p>
        <p>
          <Link href="/cohorts/september-2026/certified" className="text-green-400 hover:underline text-sm">
            September 2026 graduates
          </Link>
        </p>
      </header>

      <section aria-labelledby="podium-heading" className="space-y-4">
        <h2 id="podium-heading" className="text-xl font-bold text-white">
          Podium
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {podium.map((card) => (
            <WinnerCard key={card.permalinkId} card={card} share />
          ))}
        </div>
      </section>

      <section aria-labelledby="finalists-heading" className="space-y-4">
        <h2 id="finalists-heading" className="text-xl font-bold text-white">
          Finalists (5–15)
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranked.map((card) => (
            <WinnerCard key={card.permalinkId} card={card} share />
          ))}
        </div>
      </section>

      <section aria-labelledby="gallery-heading" className="space-y-4">
        <h2 id="gallery-heading" className="text-xl font-bold text-white">
          All projects
        </h2>
        <p className="text-sm text-gray-400">Every other submitted project from the day, unranked.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery.map((p) => {
            const github = sanitizePublicProjectUrl(p.githubUrl);
            const demo = sanitizePublicProjectUrl(p.demoUrl);
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2"
              >
                <h3 className="font-semibold text-white">
                  <Link
                    href={`/hackathon/${hackathonId}/p/${p.id}`}
                    className="hover:text-amber-200"
                  >
                    {p.title}
                  </Link>
                </h3>
                <p className="text-sm text-gray-400">{p.builders}</p>
                {p.description ? (
                  <p className="text-sm text-gray-500 line-clamp-3">{p.description}</p>
                ) : null}
                <div className="flex gap-3 text-sm">
                  {github ? (
                    <a href={github} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                      GitHub
                    </a>
                  ) : null}
                  {demo ? (
                    <a href={demo} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                      Demo
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
