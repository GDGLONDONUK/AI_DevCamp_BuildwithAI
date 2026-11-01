import Link from "next/link";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";
import type { PublicWinnerCard } from "@/lib/server/publicWinners";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import ShareButtons from "@/components/ShareButtons";
import { shareTextForWinner } from "@/lib/hackathonWinnersData";
import { publicSiteUrl } from "@/lib/siteUrl";

function AwardBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-200">
      {label}
    </span>
  );
}

export default function WinnerCard({
  card,
  share,
}: {
  card: PublicWinnerCard;
  share?: boolean;
}) {
  const github = sanitizePublicProjectUrl(card.githubUrl);
  const demo = sanitizePublicProjectUrl(card.demoUrl);
  const href = `/hackathon/${DEVCAMP_HACKATHON_ID}/p/${card.permalinkId}`;
  const url = `${publicSiteUrl()}${href}`;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3 h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <AwardBadge label={card.placementLabel} />
      </div>
      <h3 className="text-lg font-bold text-white leading-snug">
        <Link href={href} className="hover:text-amber-200">
          {card.title}
        </Link>
      </h3>
      <p className="text-sm text-gray-300">{card.builders}</p>
      <p className="text-sm text-gray-400 flex-1">{card.judgeBlurb}</p>
      <div className="flex flex-wrap gap-3 text-sm">
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
        <Link href={href} className="text-amber-300 hover:underline">
          Permalink
        </Link>
      </div>
      {share ? (
        <ShareButtons
          url={url}
          text={shareTextForWinner({
            award: card.award,
            placement: card.placement,
            title: card.title,
          })}
        />
      ) : null}
    </article>
  );
}
