import { adminDb } from "@/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";
import {
  awardSortKey,
  isHackathonAward,
  placementLabel,
  type HackathonAward,
} from "@/lib/hackathonWinnersData";
import { sanitizePublicProjectUrl } from "@/lib/safeProjectUrl";
import { publicDisplayName } from "@/lib/server/omitContactPii";

export type PublicWinnerCard = {
  permalinkId: string;
  projectId: string | null;
  title: string;
  builders: string;
  teamMembers: string[];
  judgeBlurb: string;
  award: HackathonAward;
  placement: number | null;
  placementLabel: string;
  githubUrl: string | null;
  demoUrl: string | null;
  isManual: boolean;
};

export type PublicGalleryCard = {
  id: string;
  title: string;
  builders: string;
  description: string;
  githubUrl: string | null;
  demoUrl: string | null;
};

/** Internal — userId is for graduate linking only, never sent to public pages. */
export type AwardedProjectRow = {
  id: string;
  userId: string;
  title: string;
  builders: string;
  award: HackathonAward;
  placement: number | null;
  placementLabel: string;
};

function teamMembersFrom(data: Record<string, unknown>, builders: string): string[] {
  if (Array.isArray(data.teamMembers)) {
    const names = data.teamMembers
      .map((n) => publicDisplayName(n, ""))
      .filter((n) => n.length > 0);
    if (names.length) return names;
  }
  return [builders];
}

function cardFromProject(id: string, data: Record<string, unknown>): PublicWinnerCard | null {
  if (!isHackathonAward(data.award)) return null;
  const placement = typeof data.placement === "number" ? data.placement : null;
  const builders = publicDisplayName(data.userName || data.teamName);
  return {
    permalinkId: id,
    projectId: id,
    title: String(data.title || "Untitled"),
    builders,
    teamMembers: teamMembersFrom(data, builders),
    judgeBlurb: String(data.judgeBlurb || "").slice(0, 400),
    award: data.award,
    placement,
    placementLabel: String(data.placementLabel || placementLabel(data.award, placement)),
    githubUrl: sanitizePublicProjectUrl(data.githubUrl),
    demoUrl: sanitizePublicProjectUrl(data.demoUrl),
    isManual: false,
  };
}

function cardFromManual(entry: unknown): PublicWinnerCard | null {
  if (!entry || typeof entry !== "object") return null;
  const data = entry as Record<string, unknown>;
  const id = String(data.id || "").trim();
  if (!id || !isHackathonAward(data.award)) return null;
  const placement = typeof data.placement === "number" ? data.placement : null;
  const builders = publicDisplayName(data.builders);
  return {
    permalinkId: id,
    projectId: null,
    title: String(data.title || "Untitled"),
    builders,
    teamMembers: teamMembersFrom(data, builders),
    judgeBlurb: String(data.judgeBlurb || "").slice(0, 400),
    award: data.award,
    placement,
    placementLabel: String(data.placementLabel || placementLabel(data.award, placement)),
    githubUrl: null,
    demoUrl: null,
    isManual: true,
  };
}

function galleryFromProject(id: string, data: Record<string, unknown>): PublicGalleryCard {
  return {
    id,
    title: String(data.title || "Untitled"),
    builders: publicDisplayName(data.userName || data.teamName),
    description: String(data.judgeBlurb || data.description || "").slice(0, 220),
    githubUrl: sanitizePublicProjectUrl(data.githubUrl),
    demoUrl: sanitizePublicProjectUrl(data.demoUrl),
  };
}

export async function loadHackathonProjectDocs(hackathonId = DEVCAMP_HACKATHON_ID) {
  const db = adminDb();
  const [byHack, byCohort] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", hackathonId).get(),
    db.collection("projects").where("cohortId", "==", SEPTEMBER_2026_COHORT_ID).get(),
  ]);
  const seen = new Set<string>();
  const docs: { id: string; data: Record<string, unknown> }[] = [];
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    docs.push({ id: d.id, data: d.data() || {} });
  }
  return docs;
}

export async function loadPublicWinners(hackathonId = DEVCAMP_HACKATHON_ID): Promise<{
  winners: PublicWinnerCard[];
  gallery: PublicGalleryCard[];
  winnersAnnounced: boolean;
  awarded: AwardedProjectRow[];
}> {
  const db = adminDb();
  const settingsSnap = await db.collection("hackathonSettings").doc("main").get();
  const settings = settingsSnap.data() || {};
  const winnersAnnounced = settings.winnersAnnounced === true;

  const docs = await loadHackathonProjectDocs(hackathonId);
  const winners: PublicWinnerCard[] = [];
  const gallery: PublicGalleryCard[] = [];
  const awarded: AwardedProjectRow[] = [];
  const rankedIds = new Set<string>();

  for (const { id, data } of docs) {
    if (data.organiser === true || data.organiserOverride === true) continue;
    if (data.status === "draft") continue;
    const ranked = cardFromProject(id, data);
    if (ranked) {
      winners.push(ranked);
      rankedIds.add(id);
      awarded.push({
        id,
        userId: String(data.userId || ""),
        title: ranked.title,
        builders: ranked.builders,
        award: ranked.award,
        placement: ranked.placement,
        placementLabel: ranked.placementLabel,
      });
      continue;
    }
    gallery.push(galleryFromProject(id, data));
  }

  const manual = Array.isArray(settings.manualEntries) ? settings.manualEntries : [];
  for (const entry of manual) {
    const card = cardFromManual(entry);
    if (!card || rankedIds.has(card.permalinkId)) continue;
    winners.push(card);
    rankedIds.add(card.permalinkId);
    awarded.push({
      id: card.permalinkId,
      userId: "",
      title: card.title,
      builders: card.builders,
      award: card.award,
      placement: card.placement,
      placementLabel: card.placementLabel,
    });
  }

  winners.sort(
    (a, b) =>
      awardSortKey(a.award, a.placement) - awardSortKey(b.award, b.placement) ||
      a.title.localeCompare(b.title)
  );
  gallery.sort((a, b) => a.title.localeCompare(b.title));

  return { winners, gallery, winnersAnnounced, awarded };
}

export async function loadPublicWinnerByPermalink(
  permalinkId: string
): Promise<PublicWinnerCard | PublicGalleryCard | null> {
  const { winners, gallery } = await loadPublicWinners();
  const ranked = winners.find((w) => w.permalinkId === permalinkId);
  if (ranked) return ranked;
  return gallery.find((g) => g.id === permalinkId) || null;
}

export function isRankedWinner(card: PublicWinnerCard | PublicGalleryCard): card is PublicWinnerCard {
  return "award" in card;
}
