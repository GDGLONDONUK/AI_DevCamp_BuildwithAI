import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import {
  isRankedWinner,
  loadPublicWinnerByPermalink,
} from "@/lib/server/publicWinners";
import WinnerCard from "@/components/hackathon/WinnerCard";
import ShareButtons from "@/components/ShareButtons";
import { publicSiteUrl } from "@/lib/siteUrl";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Params = { params: Promise<{ hackathonId: string; projectId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { hackathonId, projectId } = await params;
  const card = await loadPublicWinnerByPermalink(projectId);
  const title = card ? card.title : "Hackathon project";
  const builders = card && "builders" in card ? card.builders : "";
  return {
    title: `${title} — AI DevCamp 2026 Hackathon`,
    description: builders
      ? `${title} by ${builders} at the AI DevCamp 2026 Agentic Hackathon.`
      : `${title} at the AI DevCamp 2026 Agentic Hackathon.`,
    openGraph: {
      title,
      images: [`/hackathon/${hackathonId}/p/${projectId}/opengraph-image`],
    },
  };
}

export default async function ProjectPermalinkPage({ params }: Params) {
  const { hackathonId, projectId } = await params;
  if (hackathonId !== DEVCAMP_HACKATHON_ID) notFound();
  const card = await loadPublicWinnerByPermalink(projectId);
  if (!card) notFound();

  const url = `${publicSiteUrl()}/hackathon/${hackathonId}/p/${projectId}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <p className="text-sm">
        <Link href={`/hackathon/${hackathonId}/winners`} className="text-amber-300 hover:underline">
          ← All winners
        </Link>
      </p>
      {isRankedWinner(card) ? (
        <WinnerCard card={card} share />
      ) : (
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-3">
          <h1 className="text-2xl font-bold text-white">{card.title}</h1>
          <p className="text-gray-300">{card.builders}</p>
          {card.description ? <p className="text-gray-400">{card.description}</p> : null}
          <div className="flex gap-3 text-sm">
            {sanitizePublicProjectUrl(card.githubUrl) ? (
              <a
                href={sanitizePublicProjectUrl(card.githubUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline"
              >
                GitHub
              </a>
            ) : null}
            {sanitizePublicProjectUrl(card.demoUrl) ? (
              <a
                href={sanitizePublicProjectUrl(card.demoUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline"
              >
                Demo
              </a>
            ) : null}
          </div>
          <ShareButtons url={url} text={`I built ${card.title} at the AI DevCamp 2026 Agentic Hackathon 🚀 #AIDevCamp #GDGLondon #GoogleADK`} />
        </article>
      )}
    </div>
  );
}
