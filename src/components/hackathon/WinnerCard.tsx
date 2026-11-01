import Link from "next/link";
import {
  Candy,
  Crown,
  ExternalLink,
  FlaskConical,
  Ghost,
  Medal,
  Sparkles,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";
import type { PublicWinnerCard } from "@/lib/server/publicWinners";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import ShareButtons from "@/components/ShareButtons";
import { GithubIcon } from "@/components/icons/SocialBrandIcons";
import {
  halloweenRank,
  shareTextForWinner,
  type HackathonAward,
  type HalloweenRank,
} from "@/lib/hackathonWinnersData";
import { publicSiteUrl } from "@/lib/siteUrl";

const RANK_MOTIF: Record<HalloweenRank, string> = {
  1: "🎃",
  2: "👻",
  3: "🍬",
  4: "🧙",
  5: "🧪",
};

function RankIcon({ rank, award }: { rank: HalloweenRank | null; award: HackathonAward }) {
  if (rank === 1) return award === "first-in-person" ? <Crown size={13} aria-hidden /> : <Trophy size={13} aria-hidden />;
  if (rank === 2) return <Ghost size={13} aria-hidden />;
  if (rank === 3) return <Candy size={13} aria-hidden />;
  if (rank === 4) return <WandSparkles size={13} aria-hidden />;
  if (rank === 5) return <FlaskConical size={13} aria-hidden />;
  return award === "finalist" ? <Sparkles size={13} aria-hidden /> : <Medal size={13} aria-hidden />;
}

function badgeTone(rank: HalloweenRank | null, award: HackathonAward): string {
  if (rank === 1) return "border-amber-400/70 bg-amber-500/25 text-amber-100";
  if (rank === 2) return "border-sky-200/50 bg-sky-100/10 text-sky-100";
  if (rank === 3) return "border-orange-400/55 bg-orange-700/30 text-orange-100";
  if (rank === 4) return "border-violet-400/55 bg-violet-500/20 text-violet-100";
  if (rank === 5) return "border-lime-400/50 bg-lime-500/15 text-lime-100";
  if (award === "peoples-choice") return "border-pink-400/45 bg-pink-500/15 text-pink-100";
  return "border-violet-400/35 bg-violet-500/10 text-violet-100";
}

function AwardBadge({
  label,
  award,
  rank,
}: {
  label: string;
  award: HackathonAward;
  rank: HalloweenRank | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeTone(rank, award)}`}
    >
      <RankIcon rank={rank} award={award} />
      {label}
    </span>
  );
}

function awardCardClass(award: HackathonAward, rank: HalloweenRank | null): string {
  if (rank === 1) return "hh-winner-gold hh-rank-1";
  if (rank === 2) return "hh-rank-2";
  if (rank === 3) return "hh-rank-3";
  if (rank === 4) return "hh-rank-4";
  if (rank === 5) return "hh-rank-5";
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
  const rank = halloweenRank(card.award, card.placement);
  const standout = featured || rank != null;

  return (
    <article
      className={`hh-winner-card rounded-2xl border border-white/10 bg-white/[0.04] h-full flex flex-col ${awardCardClass(card.award, rank)} ${
        standout ? "p-6 sm:p-7" : "p-5"
      }`}
    >
      {rank ? (
        <div className="hh-rank-head">
          <div>
            <p className="hh-rank-mark" aria-hidden>
              {rank}
            </p>
            <AwardBadge label={card.placementLabel} award={card.award} rank={rank} />
          </div>
          <span className="hh-rank-motif" aria-hidden>
            {RANK_MOTIF[rank]}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AwardBadge label={card.placementLabel} award={card.award} rank={rank} />
        </div>
      )}
      <h3
        className={`font-bold text-white leading-snug ${standout ? "text-2xl" : "text-lg"}`}
      >
        <Link href={href} className="hover:text-amber-200">
          {card.title}
        </Link>
      </h3>
      <p className={`mt-1.5 text-[var(--hh-muted)] ${standout ? "text-base" : "text-sm"}`}>
        {card.builders}
      </p>
      <p
        className={`mt-3 text-[var(--hh-muted)] flex-1 leading-relaxed ${
          standout ? "text-[0.95rem]" : "text-sm"
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
            compact={!standout}
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
