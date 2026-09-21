/**
 * Editable home / marketing copy. Source of truth: Firestore `siteContent/home`
 * (Admin SDK via /api/site-content). Defaults keep the site usable before seed.
 */

export const SITE_CONTENT_COLLECTION = "siteContent";
export const HOME_SITE_CONTENT_DOC_ID = "home";

export type CohortPillTone = "blue" | "amber" | "neutral";
export type CohortPillIcon = "calendar" | "archive" | "mapPin" | "clock";

export type HomeSiteContent = {
  discordInviteUrl: string;
  discordLinkLabel: string;
  announcementBanner: {
    enabled: boolean;
    text: string;
  };
  pastCohortsCta: {
    enabled: boolean;
    label: string;
    href: string;
  };
  terminal: {
    filename: string;
    /** Lines shown after the green → in the hero terminal card */
    lines: string[];
  };
  cohortPills: Array<{
    id: string;
    label: string;
    tone: CohortPillTone;
    icon: CohortPillIcon;
  }>;
  joinCohortBanner: {
    title: string;
    body: string;
    buttonLabel: string;
    successJoined: string;
    successAlready: string;
  };
  kickoffCta: {
    partnersLabel: string;
    headline: string;
    dateLine: string;
    locationLine: string;
  };
  stats: {
    weeksValue: string;
    projectsValue: string;
    activeAttendeesValue: string;
  };
  /** e.g. "4 weeks · Thu / Sat / Tue @ 18:00" — session count is live */
  scheduleSubtitle: string;
  updatedAt?: string;
};

export const DEFAULT_HOME_SITE_CONTENT: HomeSiteContent = {
  discordInviteUrl: "https://discord.gg/jRBz8nsch",
  discordLinkLabel: "Join GDG London on Discord",
  announcementBanner: {
    enabled: true,
    text: "NEXT COHORT: 23 SEPTEMBER 2026 (Wed) · 3 HR",
  },
  pastCohortsCta: {
    enabled: true,
    label: "📚 VIEW PAST COHORTS",
    href: "/past-cohorts",
  },
  terminal: {
    filename: "ai-devcamp ~ program.sh",
    lines: [
      "🚀 September 2026: NEW COHORT COMING",
      "📅 Past Cohorts: June 2026 ✅ View & Explore",
      "4-week beginner AI program · GDG London",
      "AI Agents · MCP · Google ADK · Real Projects",
    ],
  },
  cohortPills: [
    {
      id: "dates",
      label: "Sept 3 – Oct 1, 2026 (Coming Soon)",
      tone: "blue",
      icon: "calendar",
    },
    {
      id: "past",
      label: "June 2026 (Past Cohort Available)",
      tone: "amber",
      icon: "archive",
    },
    {
      id: "format",
      label: "Online & In-Person",
      tone: "neutral",
      icon: "mapPin",
    },
    {
      id: "time",
      label: "6 PM – 9 PM",
      tone: "neutral",
      icon: "clock",
    },
  ],
  joinCohortBanner: {
    title: "AI DevCamp September 2026 is open",
    body: "Sign in complete — join the new cohort to access September sessions, attendance, assignments, and tasks. New to the programme? Use Register instead.",
    buttonLabel: "Join September 2026",
    successJoined: "Joined AI DevCamp September 2026",
    successAlready: "Already enrolled in September 2026",
  },
  kickoffCta: {
    partnersLabel: "GDG London × Build with AI × Skyscanner",
    headline: "AI DevCamp Kick Off",
    dateLine: "23 September 2026",
    locationLine: "Skyscanner HQ · London · W1D 4AL · 6:00 PM – 9:00 PM · Free to attend",
  },
  stats: {
    weeksValue: "4",
    projectsValue: "40+",
    activeAttendeesValue: "150+",
  },
  scheduleSubtitle: "4 weeks · Thu / Sat / Tue @ 18:00",
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const PILL_TONES: CohortPillTone[] = ["blue", "amber", "neutral"];
const PILL_ICONS: CohortPillIcon[] = ["calendar", "archive", "mapPin", "clock"];

function mergePills(
  raw: unknown,
  fallback: HomeSiteContent["cohortPills"]
): HomeSiteContent["cohortPills"] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const tone = PILL_TONES.includes(o.tone as CohortPillTone)
        ? (o.tone as CohortPillTone)
        : "neutral";
      const icon = PILL_ICONS.includes(o.icon as CohortPillIcon)
        ? (o.icon as CohortPillIcon)
        : "calendar";
      const label = asString(o.label, "");
      if (!label) return null;
      return {
        id: asString(o.id, `pill-${i}`),
        label,
        tone,
        icon,
      };
    })
    .filter((p): p is HomeSiteContent["cohortPills"][number] => p !== null);
}

/** Merge Firestore data with defaults so missing fields never blank the home page. */
export function normalizeHomeSiteContent(raw: unknown): HomeSiteContent {
  const d = DEFAULT_HOME_SITE_CONTENT;
  if (!raw || typeof raw !== "object") return { ...d };

  const o = raw as Record<string, unknown>;
  const announcement =
    o.announcementBanner && typeof o.announcementBanner === "object"
      ? (o.announcementBanner as Record<string, unknown>)
      : {};
  const past =
    o.pastCohortsCta && typeof o.pastCohortsCta === "object"
      ? (o.pastCohortsCta as Record<string, unknown>)
      : {};
  const terminal =
    o.terminal && typeof o.terminal === "object"
      ? (o.terminal as Record<string, unknown>)
      : {};
  const join =
    o.joinCohortBanner && typeof o.joinCohortBanner === "object"
      ? (o.joinCohortBanner as Record<string, unknown>)
      : {};
  const kickoff =
    o.kickoffCta && typeof o.kickoffCta === "object"
      ? (o.kickoffCta as Record<string, unknown>)
      : {};
  const stats =
    o.stats && typeof o.stats === "object" ? (o.stats as Record<string, unknown>) : {};

  const terminalLines = Array.isArray(terminal.lines)
    ? terminal.lines.filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    : d.terminal.lines;

  return {
    discordInviteUrl: asString(o.discordInviteUrl, d.discordInviteUrl),
    discordLinkLabel: asString(o.discordLinkLabel, d.discordLinkLabel),
    announcementBanner: {
      enabled: asBool(announcement.enabled, d.announcementBanner.enabled),
      text: asString(announcement.text, d.announcementBanner.text),
    },
    pastCohortsCta: {
      enabled: asBool(past.enabled, d.pastCohortsCta.enabled),
      label: asString(past.label, d.pastCohortsCta.label),
      href: asString(past.href, d.pastCohortsCta.href),
    },
    terminal: {
      filename: asString(terminal.filename, d.terminal.filename),
      lines: terminalLines.length > 0 ? terminalLines : d.terminal.lines,
    },
    cohortPills: mergePills(o.cohortPills, d.cohortPills),
    joinCohortBanner: {
      title: asString(join.title, d.joinCohortBanner.title),
      body: asString(join.body, d.joinCohortBanner.body),
      buttonLabel: asString(join.buttonLabel, d.joinCohortBanner.buttonLabel),
      successJoined: asString(join.successJoined, d.joinCohortBanner.successJoined),
      successAlready: asString(join.successAlready, d.joinCohortBanner.successAlready),
    },
    kickoffCta: {
      partnersLabel: asString(kickoff.partnersLabel, d.kickoffCta.partnersLabel),
      headline: asString(kickoff.headline, d.kickoffCta.headline),
      dateLine: asString(kickoff.dateLine, d.kickoffCta.dateLine),
      locationLine: asString(kickoff.locationLine, d.kickoffCta.locationLine),
    },
    stats: {
      weeksValue: asString(stats.weeksValue, d.stats.weeksValue),
      projectsValue: asString(stats.projectsValue, d.stats.projectsValue),
      activeAttendeesValue: asString(stats.activeAttendeesValue, d.stats.activeAttendeesValue),
    },
    scheduleSubtitle: asString(o.scheduleSubtitle, d.scheduleSubtitle),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}
