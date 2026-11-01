import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin, Sparkles, Trophy, Users } from "lucide-react";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { loadPublicWinners } from "@/lib/server/publicWinners";
import { loadHackathonPublicContent } from "@/lib/server/hackathonPublicContent";
import { loadGooglePhotosPreview } from "@/lib/server/googlePhotosPreview";
import WinnerCard from "@/components/hackathon/WinnerCard";
import EventPhotosSection from "@/components/hackathon/EventPhotosSection";
import { GithubIcon } from "@/components/icons/SocialBrandIcons";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";
import { halloweenRank } from "@/lib/hackathonWinnersData";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "AI DevCamp 2026 Agentic Hackathon — Winners",
  description:
    "Winners of the AI DevCamp 2026 Agentic Hackathon at Encode Hub, London and online. 30 projects built with Google ADK in one day.",
};

function SectionHeading({
  id,
  kicker,
  title,
  detail,
  haunt,
}: {
  id: string;
  kicker: string;
  title: string;
  detail?: string;
  haunt?: boolean;
}) {
  return (
    <div className="border-b border-[var(--hh-line)] pb-3 mb-5">
      <p className="font-mono text-xs tracking-[0.2em] text-amber-300 mb-1">{kicker}</p>
      <h2
        id={id}
        className={haunt ? "hh-section-haunt text-3xl sm:text-4xl" : "text-2xl sm:text-3xl font-bold text-white"}
      >
        {title}
      </h2>
      {detail ? <p className="mt-1 text-sm text-[var(--hh-muted)]">{detail}</p> : null}
    </div>
  );
}

export default async function HackathonWinnersPage({
  params,
}: {
  params: Promise<{ hackathonId: string }>;
}) {
  const { hackathonId } = await params;
  if (hackathonId !== DEVCAMP_HACKATHON_ID) notFound();

  const [{ winners, gallery }, content] = await Promise.all([
    loadPublicWinners(hackathonId),
    loadHackathonPublicContent(),
  ]);
  const photos = await loadGooglePhotosPreview(
    content.photosAlbumUrl,
    content.photosAlbumTitle
  );
  const champions = winners.filter((w) => halloweenRank(w.award, w.placement) === 1);
  const podium = winners.filter((w) => {
    const rank = halloweenRank(w.award, w.placement);
    return rank === 2 || rank === 3 || rank === 4 || rank === 5;
  });
  const ranked = winners.filter((w) => halloweenRank(w.award, w.placement) == null);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
      <header className="text-center space-y-5">
        <p className="font-mono text-sm tracking-[0.22em] text-amber-300">
          🎃 31 OCT 2026 · ENCODE HUB
        </p>
        <h1 className="hh-title" style={{ fontSize: "clamp(2.8rem, 9vw, 5.2rem)" }}>
          Winners
        </h1>
        <p className="text-lg text-[var(--hh-muted)] max-w-2xl mx-auto leading-relaxed">
          Thirty agent projects, built in a day with Google ADK — in person in London and
          online.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hh-line)] bg-white/[0.04] px-3 py-1.5 text-sm text-[var(--hh-muted)]">
            <Trophy size={14} className="text-amber-300" aria-hidden />
            {winners.length} awarded
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hh-line)] bg-white/[0.04] px-3 py-1.5 text-sm text-[var(--hh-muted)]">
            <Users size={14} className="text-amber-300" aria-hidden />
            {gallery.length + winners.length} projects
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hh-line)] bg-white/[0.04] px-3 py-1.5 text-sm text-[var(--hh-muted)]">
            <MapPin size={14} className="text-amber-300" aria-hidden />
            London + online
          </span>
        </div>
        <p>
          <Link
            href="/cohorts/september-2026/certified"
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
          >
            <Sparkles size={14} aria-hidden />
            September 2026 graduates
          </Link>
        </p>
      </header>

      <EventPhotosSection photos={photos} compact />

      <section aria-labelledby="champions-heading">
        <SectionHeading
          id="champions-heading"
          kicker="🎃 1ST PLACE"
          title="Champions of the night"
          detail="Joint first — strongest in-person build, and the highest-scoring online project."
          haunt
        />
        <div className="grid md:grid-cols-2 gap-5">
          {champions.map((card) => (
            <WinnerCard key={card.permalinkId} card={card} share featured />
          ))}
        </div>
      </section>

      <section aria-labelledby="podium-heading">
        <SectionHeading
          id="podium-heading"
          kicker="👻 2ND · 🍬 3RD · 🧙 4TH · 🧪 5TH"
          title="The hunt continues"
          detail="Four more spells from the night — 2nd through 5th."
          haunt
        />
        <div className="grid sm:grid-cols-2 gap-5">
          {podium.map((card) => (
            <WinnerCard key={card.permalinkId} card={card} share featured />
          ))}
        </div>
      </section>

      <section aria-labelledby="finalists-heading">
        <SectionHeading
          id="finalists-heading"
          kicker="SHORTLIST"
          title="Finalists"
          detail="Places 6–15 — the rest of the day’s strongest show-and-tells."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranked.map((card) => (
            <WinnerCard key={card.permalinkId} card={card} share />
          ))}
        </div>
      </section>

      <section aria-labelledby="gallery-heading">
        <SectionHeading
          id="gallery-heading"
          kicker="GALLERY"
          title="All projects"
          detail="Every other submitted project from the day, unranked."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery.map((p) => {
            const github = sanitizePublicProjectUrl(p.githubUrl);
            const demo = sanitizePublicProjectUrl(p.demoUrl);
            return (
              <article
                key={p.id}
                className="hh-winner-card rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col"
              >
                <h3 className="font-semibold text-white text-lg leading-snug">
                  <Link
                    href={`/hackathon/${hackathonId}/p/${p.id}`}
                    className="hover:text-amber-200"
                  >
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-1.5 text-sm text-[var(--hh-muted)]">{p.builders}</p>
                {p.description ? (
                  <p className="mt-2 text-sm text-[var(--hh-muted)]/80 line-clamp-3 flex-1 leading-relaxed">
                    {p.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {github ? (
                    <a
                      href={github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-semibold text-[var(--hh-pumpkin-2)] hover:bg-white/[0.06]"
                    >
                      <GithubIcon size={14} />
                      GitHub
                    </a>
                  ) : null}
                  {demo ? (
                    <a
                      href={demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-semibold text-[var(--hh-pumpkin-2)] hover:bg-white/[0.06]"
                    >
                      <ExternalLink size={14} aria-hidden />
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
