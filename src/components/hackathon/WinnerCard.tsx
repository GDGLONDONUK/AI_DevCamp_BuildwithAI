import Link from "next/link";
import { Crown, ExternalLink, Heart, Medal, Sparkles, Trophy } from "lucide-react";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";
import type { PublicWinnerCard } from "@/lib/server/publicWinners";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import ShareButtons from "@/components/ShareButtons";
import { GithubIcon } from "@/components/icons/SocialBrandIcons";
import { shareTextForWinner, type HackathonAward } from "@/lib/hackathonWinnersData";
import { publicSiteUrl } from "@/lib/siteUrl";

function AwardBadge({
  label,
  award,
}: {
  label: string;
  award: HackathonAward;
}) {
  const Icon =
    award === "first-online" || award === "first-in-person"
      ? Trophy
      : award === "peoples-choice"
        ? Heart
        : award === "finalist"
          ? Sparkles
          : Medal;

  const tone =
    award === "first-online" || award === "first-in-person"
      ? "border-amber-400/60 bg-amber-500/20 text-amber-100"
      : award === "second"
        ? "border-slate-300/50 bg-slate-100/10 text-slate-100"
        : award === "third"
          ? "border-orange-400/40 bg-orange-800/30 text-orange-100"
          : award === "peoples-choice"
            ? "border-pink-400/45 bg-pink-500/15 text-pink-100"
            : "border-violet-400/35 bg-violet-500/10 text-violet-100";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      <Icon size={13} aria-hidden />
      {label}
    </span>
  );
}

function awardCardClass(award: HackathonAward): string {
  if (award === "first-online" || award === "first-in-person") return "hh-winner-gold";
  if (award === "second") return "hh-winner-silver";
  if (award === "third") return "hh-winner-bronze";
  if (award === "peoples-choice") return "hh-winner-choice";
  return "";
}

export default function WinnerCard({
  card,
  share,
  featured,
}: {
  card: PublicWinnerCard;
  share?: boolean;
  featured?: boolean;
}) {
  const github = sanitizePublicProjectUrl(card.githubUrl);
  const demo = sanitizePublicProjectUrl(card.demoUrl);
  const href = `/hackathon/${DEVCAMP_HACKATHON_ID}/p/${card.permalinkId}`;
  const url = `${publicSiteUrl()}${href}`;
  const ChampionIcon =
    card.award === "first-in-person" ? Crown : card.award === "peoples-choice" ? Heart : Trophy;

  return (
    <article
      className={`hh-winner-card rounded-2xl border border-white/10 bg-white/[0.04] h-full flex flex-col ${awardCardClass(card.award)} ${
        featured ? "p-6 sm:p-7" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {featured ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
            <ChampionIcon size={18} aria-hidden />
          </span>
        ) : null}
        <AwardBadge label={card.placementLabel} award={card.award} />
      </div>
      <h3
        className={`font-bold text-white leading-snug ${featured ? "text-2xl" : "text-lg"}`}
      >
        <Link href={href} className="hover:text-amber-200">
          {card.title}
        </Link>
      </h3>
      <p className={`mt-1.5 text-[var(--hh-muted)] ${featured ? "text-base" : "text-sm"}`}>
        {card.builders}
      </p>
      <p
        className={`mt-3 text-[var(--hh-muted)] flex-1 leading-relaxed ${
          featured ? "text-[0.95rem]" : "text-sm"
        }`}
      >
        {card.judgeBlurb}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {github ? (
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-semibold text-[var(--hh-pumpkin-2)] hover:bg-white/[0.08]"
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
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-semibold text-[var(--hh-pumpkin-2)] hover:bg-white/[0.08]"
          >
            <ExternalLink size={14} aria-hidden />
            Demo
          </a>
        ) : null}
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-semibold text-amber-200 hover:bg-white/[0.08]"
        >
          Project
        </Link>
      </div>
      {share ? (
        <div className="mt-4 pt-4 border-t border-white/10">
          <ShareButtons
            compact={!featured}
            url={url}
            text={shareTextForWinner({
              award: card.award,
              placement: card.placement,
              title: card.title,
            })}
          />
        </div>
      ) : null}
    </article>
  );
}
