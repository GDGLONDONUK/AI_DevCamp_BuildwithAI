import type { HomeSiteContent } from "@/lib/siteContent";
import { DEFAULT_HOME_SITE_CONTENT } from "@/lib/siteContent";
import { auth } from "@/lib/firebase";

type ApiEnvelope = { ok: boolean; data?: HomeSiteContent; error?: string };

export async function fetchHomeSiteContent(): Promise<HomeSiteContent> {
  try {
    const res = await fetch("/api/site-content");
    const json = (await res.json()) as ApiEnvelope;
    if (!res.ok || !json.ok || !json.data) {
      return { ...DEFAULT_HOME_SITE_CONTENT };
    }
    return json.data;
  } catch {
    return { ...DEFAULT_HOME_SITE_CONTENT };
  }
}

async function adminAuthHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchAdminHomeSiteContent(): Promise<HomeSiteContent> {
  const headers = await adminAuthHeaders();
  const res = await fetch("/api/admin/site-content", { headers });
  const json = (await res.json()) as ApiEnvelope;
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "Failed to load site content");
  }
  return json.data;
}

export async function saveAdminHomeSiteContent(
  content: HomeSiteContent
): Promise<HomeSiteContent> {
  const headers = await adminAuthHeaders();
  const body = {
    discordInviteUrl: content.discordInviteUrl,
    discordLinkLabel: content.discordLinkLabel,
    announcementBanner: content.announcementBanner,
    pastCohortsCta: content.pastCohortsCta,
    terminal: content.terminal,
    cohortPills: content.cohortPills,
    joinCohortBanner: content.joinCohortBanner,
    kickoffCta: content.kickoffCta,
    stats: content.stats,
    scheduleSubtitle: content.scheduleSubtitle,
  };
  const res = await fetch("/api/admin/site-content", {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope;
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "Failed to save site content");
  }
  return json.data;
}

export async function seedAdminHomeSiteContent(): Promise<HomeSiteContent> {
  const headers = await adminAuthHeaders();
  const res = await fetch("/api/admin/site-content", {
    method: "PUT",
    headers,
    body: JSON.stringify({ action: "seed" }),
  });
  const json = (await res.json()) as ApiEnvelope;
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "Failed to seed site content");
  }
  return json.data;
}
