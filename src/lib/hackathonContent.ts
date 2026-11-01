/**
 * Agentic Hackathon content types + seed defaults.
 * Runtime source of truth: Firestore `hackathonSettings/main` (Admin SDK).
 */

export type ContentLink = { href: string; label: string };

export type RulesSectionKind = "card" | "list" | "numbered" | "judging" | "warning";
export type RulesSectionVariant = "default" | "violet" | "amber" | "emerald";
export type RulesSectionIcon =
  | "ticket"
  | "shield"
  | "users"
  | "lightbulb"
  | "upload"
  | "award"
  | "gift"
  | "database"
  | "clock";

export type RulesSection = {
  id: string;
  kind: RulesSectionKind;
  title: string;
  body?: string;
  items?: string[];
  variant?: RulesSectionVariant;
  icon?: RulesSectionIcon;
  linkHref?: string;
  linkLabel?: string;
  sortOrder: number;
};

export type HackathonPrizeEntry = {
  id: string;
  name: string;
  imageSrc: string;
  featured?: boolean;
  sortOrder: number;
  /** in-person day prizes vs online-only awards */
  audience?: "in-person" | "online" | "all";
  note?: string;
};

export const HACKATHON_TECH_TAGS = [
  "Gemini",
  "Vertex AI",
  "Google ADK",
  "Firebase",
  "Cloud Run",
  "OpenAI",
  "Claude",
  "Hugging Face",
  "Flutter",
  "Next.js",
  "Python",
  "Other",
] as const;

export const DEFAULT_HACKATHON_PRIZES: HackathonPrizeEntry[] = [
  {
    id: "jbl-tune-720bt",
    name: "JBL Tune 720BT headphones",
    imageSrc: "/hackathon/prizes/JBL_Tune_720BT.png",
    featured: true,
    sortOrder: 0,
    audience: "in-person",
  },
  {
    id: "jbl-go",
    name: "JBL Go speaker",
    imageSrc: "/hackathon/prizes/JBL_Go.png",
    featured: true,
    sortOrder: 1,
    audience: "in-person",
  },
  {
    id: "wireless-keyboard",
    name: "Wireless keyboard",
    imageSrc: "/hackathon/prizes/Wireless mechanical gaming keyboard.png",
    featured: true,
    sortOrder: 2,
    audience: "in-person",
  },
  {
    id: "bag",
    name: "Bag",
    imageSrc: "/hackathon/prizes/Google_bags.png",
    sortOrder: 3,
    audience: "in-person",
  },
  {
    id: "google-socks",
    name: "Google socks",
    imageSrc: "/hackathon/prizes/Google_Socks.png",
    sortOrder: 4,
    audience: "in-person",
  },
  {
    id: "amazon-voucher-online",
    name: "Amazon voucher",
    imageSrc: "/hackathon/prizes/Amazon_voucher.svg",
    featured: true,
    sortOrder: 5,
    audience: "online",
    note: "One Amazon voucher for online participants — claim rules announced on the day.",
  },
];

export const HAUNTED_KIOSK_URL = "https://aidevcamp-halloween-hack.vercel.app/";
export const HAUNTED_KIOSK_BUILD_URL = "https://aidevcamp-halloween-hack.vercel.app/build";

export type HackathonStarterLink = {
  id: string;
  audience: string;
  title: string;
  blurb: string;
  href: string;
  label: string;
};

/** Starter pack emailed for the closing hackathon. No tracking query params. */
export const HACKATHON_STARTER_LINKS: HackathonStarterLink[] = [
  {
    id: "beginner-coding",
    audience: "New to coding",
    title: "Start here",
    blurb: "Beginner coding resource — a starting point if you are new to programming.",
    href: "https://claude.ai/artifact/A7as43vs7VEURNiciCKegQ",
    label: "Explore the beginner coding resource",
  },
  {
    id: "beginner-agents",
    audience: "New to AI agents",
    title: "Learn the basics",
    blurb: "What AI agents are, before you start building.",
    href: "https://app.gitbook.com/o/QmDNG4JEnkJ1l4zy56g2/sites/site_RPJpo/s/hOG0AEyMnm8rgrfWDnlA/~/preview/",
    label: "Explore the beginner’s guide to agents",
  },
  {
    id: "social-media-labs",
    audience: "Hands-on labs",
    title: "Build a social media agent from scratch",
    blurb: "Step-by-step labs to build your own social media agent.",
    href: "https://sonikajanagill.com/ai-devcamp-labs/index.html",
    label: "Start the social media agent labs",
  },
  {
    id: "halloween-photo",
    audience: "Codelab",
    title: "Try the Halloween photo codelab",
    blurb: "Build a spooky photo experience in the Haunted Kiosk build lab.",
    href: HAUNTED_KIOSK_BUILD_URL,
    label: "Open the photo codelab",
  },
  {
    id: "hackathon-hub",
    audience: "Event hub",
    title: "Hackathon hub on this site",
    blurb: "Schedule, rules, prizes, submit, and winners for the Agentic Hackathon.",
    href: "https://aidevcamp.gdg.london/hackathon",
    label: "Open the hackathon hub",
  },
];

export type JudgingCriterion = { title: string; detail: string };

export type HackathonPublicContent = {
  prizes: HackathonPrizeEntry[];
  rulesSections: RulesSection[];
  judgingCriteria: JudgingCriterion[];
  starterLinks: HackathonStarterLink[];
  resourceLinks: ContentLink[];
  hauntedKioskUrl: string;
  hauntedKioskBuildUrl: string;
};

export const DEFAULT_RESOURCE_LINKS: ContentLink[] = [
  ...HACKATHON_STARTER_LINKS.map((l) => ({ href: l.href, label: l.label })),
  { href: HAUNTED_KIOSK_URL, label: "Haunted Kiosk · photo booth" },
  { href: "https://ai.google.dev/docs", label: "Gemini API Docs" },
  { href: "https://aistudio.google.com/", label: "Google AI Studio" },
  { href: "https://google.github.io/adk-docs/", label: "Google ADK Docs" },
  { href: "https://cloud.google.com/vertex-ai/docs", label: "Vertex AI Docs" },
  { href: "https://huggingface.co/docs", label: "Hugging Face Docs" },
];

export const DEFAULT_RULES_SECTIONS: RulesSection[] = [
  {
    id: "ticket",
    kind: "card",
    title: "Event ticket / RSVP",
    body: "You need a valid Luma RSVP for the Agentic Hackathon day to present and claim prizes in person.",
    variant: "violet",
    icon: "ticket",
    linkHref: "https://luma.com/wz7509ty",
    linkLabel: "RSVP on Luma →",
    sortOrder: 0,
  },
  {
    id: "who",
    kind: "card",
    title: "Who can enter",
    body: "AI DevCamp September 2026 attendees: your final cohort project is your hackathon entry. Everyone else: register on this site, join the hackathon, and submit a project.",
    icon: "shield",
    sortOrder: 1,
  },
  {
    id: "eligibility",
    kind: "card",
    title: "Eligibility",
    body: "Event organisers, speakers, and volunteers cannot and will not compete for prizes.",
    icon: "shield",
    sortOrder: 2,
  },
  {
    id: "teams",
    kind: "card",
    title: "Teams",
    items: [
      "Solo builder or team (max 4 members)",
      "Create an idea and allow others to join, or join an existing team with approval",
    ],
    icon: "users",
    sortOrder: 3,
  },
  {
    id: "ideas",
    kind: "card",
    title: "Create or join a project idea",
    body: "When registering your idea, provide:",
    items: [
      "Project title",
      "Team name",
      "Solo or group",
      "Description / purpose",
      "Optional: browse the Idea Gallery and request to join an open project",
    ],
    icon: "lightbulb",
    sortOrder: 4,
  },
  {
    id: "avoid",
    kind: "warning",
    title: "Avoid these project types",
    body: "In the Action Era, if a single prompt can solve it, it's not an application.",
    items: [
      "Baseline RAG — simple data retrieval as the whole product",
      "Prompt-only wrappers — system prompts in a basic UI",
      "Simple vision analyzers — basic object identification",
      "Generic chatbots — nutrition, job screening, etc.",
      "Medical advice — no diagnostic advice projects",
    ],
    sortOrder: 5,
  },
  {
    id: "submit",
    kind: "numbered",
    title: "What to submit",
    body: "Each final submission must include:",
    items: [
      "A working project",
      "A demo video (max 3 minutes) — optional but recommended",
      "Project description — problem, idea, and how it works",
      "Code repository link (GitHub). If private, grant judges read access",
      "Optional: screenshots and technical notes",
    ],
    icon: "upload",
    sortOrder: 6,
  },
  {
    id: "judging",
    kind: "judging",
    title: "Judging criteria",
    icon: "award",
    sortOrder: 7,
  },
  {
    id: "prizes",
    kind: "card",
    title: "Winning prizes — important",
    body: "Physical prizes (headphones, speaker, keyboard, bag, socks) are handed out live on event day — be there in person to claim them.\n\nOnline participants: one Amazon voucher is awarded (details announced on the day).\n\nFor team projects, the prize goes to the project leader. How you share it with your team is up to you.",
    variant: "amber",
    icon: "gift",
    sortOrder: 8,
  },
  {
    id: "voting",
    kind: "card",
    title: "Audience voting",
    body: "Signed-in eligible participants only. Fixed vote budget, max votes per project, no voting for your own project. Votes are recorded server-side; totals are recomputed from the ballot log. Voting opens only when organisers enable it.",
    icon: "award",
    sortOrder: 9,
  },
  {
    id: "data",
    kind: "card",
    title: "Your data",
    body: "Submission data is kept for judging and event purposes and is not shared outside the competition.",
    variant: "emerald",
    icon: "database",
    sortOrder: 10,
  },
  {
    id: "deadline",
    kind: "card",
    title: "Submission deadline",
    body: "Saturday, 31 October 2026 — during the Agentic Hackathon (show-and-tell before awards).",
    variant: "violet",
    icon: "clock",
    sortOrder: 11,
  },
];

export const JUDGING_CRITERIA: JudgingCriterion[] = [
  { title: "Impact", detail: "Does it solve a real problem for a clear audience?" },
  { title: "Technical depth", detail: "Agents, tools, MCP/ADK, deployment — beyond a thin wrapper." },
  { title: "Demo clarity", detail: "Can judges understand and see it working quickly?" },
  { title: "Originality", detail: "Fresh angle, not a copy of a common tutorial." },
];

export const DEFAULT_HACKATHON_PUBLIC_CONTENT: HackathonPublicContent = {
  prizes: DEFAULT_HACKATHON_PRIZES,
  rulesSections: DEFAULT_RULES_SECTIONS,
  judgingCriteria: JUDGING_CRITERIA,
  starterLinks: HACKATHON_STARTER_LINKS,
  resourceLinks: DEFAULT_RESOURCE_LINKS,
  hauntedKioskUrl: HAUNTED_KIOSK_URL,
  hauntedKioskBuildUrl: HAUNTED_KIOSK_BUILD_URL,
};

export function hackathonStarterResourcesPayload(
  content: Pick<HackathonPublicContent, "starterLinks"> = DEFAULT_HACKATHON_PUBLIC_CONTENT
) {
  const links = content.starterLinks.length
    ? content.starterLinks
    : HACKATHON_STARTER_LINKS;
  return {
    title: "Helpful resources for the AI DevCamp Hackathon",
    event: "AI DevCamp 2026 Agentic Hackathon (closing session, 31 Oct 2026)",
    closingSessionId: "sept-2026-hackathon",
    links: links.map((l) => ({
      id: l.id,
      audience: l.audience,
      title: l.title,
      blurb: l.blurb,
      url: l.href,
      label: l.label,
    })),
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asSafeHref(value: unknown, fallback: string): string {
  const raw = asString(value, fallback);
  if (raw.startsWith("https://") || raw.startsWith("http://") || raw.startsWith("/")) {
    return raw;
  }
  return fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return items.length ? items : undefined;
}

function normalizePrize(raw: unknown, fallback?: HackathonPrizeEntry): HackathonPrizeEntry | null {
  if (!raw || typeof raw !== "object") return fallback ?? null;
  const o = raw as Record<string, unknown>;
  const id = asString(o.id, fallback?.id || "");
  const name = asString(o.name, fallback?.name || "");
  if (!id || !name) return fallback ?? null;
  const audience =
    o.audience === "online" || o.audience === "in-person" || o.audience === "all"
      ? o.audience
      : fallback?.audience;
  return {
    id,
    name,
    imageSrc: asString(o.imageSrc, fallback?.imageSrc || ""),
    featured: o.featured === true ? true : fallback?.featured,
    sortOrder: asNumber(o.sortOrder, fallback?.sortOrder ?? 0),
    ...(audience ? { audience } : {}),
    ...(typeof o.note === "string" && o.note.trim()
      ? { note: o.note.trim() }
      : fallback?.note
        ? { note: fallback.note }
        : {}),
  };
}

function normalizeStarter(raw: unknown, fallback?: HackathonStarterLink): HackathonStarterLink | null {
  if (!raw || typeof raw !== "object") return fallback ?? null;
  const o = raw as Record<string, unknown>;
  const id = asString(o.id, fallback?.id || "");
  const href = asSafeHref(o.href, fallback?.href || "");
  if (!id || !href) return fallback ?? null;
  return {
    id,
    audience: asString(o.audience, fallback?.audience || ""),
    title: asString(o.title, fallback?.title || ""),
    blurb: asString(o.blurb, fallback?.blurb || ""),
    href,
    label: asString(o.label, fallback?.label || href),
  };
}

function normalizeRule(raw: unknown, fallback?: RulesSection): RulesSection | null {
  if (!raw || typeof raw !== "object") return fallback ?? null;
  const o = raw as Record<string, unknown>;
  const id = asString(o.id, fallback?.id || "");
  const title = asString(o.title, fallback?.title || "");
  if (!id || !title) return fallback ?? null;
  const kind = (
    ["card", "list", "numbered", "judging", "warning"] as RulesSectionKind[]
  ).includes(o.kind as RulesSectionKind)
    ? (o.kind as RulesSectionKind)
    : fallback?.kind || "card";
  const items = asStringList(o.items) ?? fallback?.items;
  return {
    id,
    kind,
    title,
    body: typeof o.body === "string" ? o.body : fallback?.body,
    ...(items ? { items } : {}),
    variant: (["default", "violet", "amber", "emerald"] as RulesSectionVariant[]).includes(
      o.variant as RulesSectionVariant
    )
      ? (o.variant as RulesSectionVariant)
      : fallback?.variant,
    icon: fallback?.icon,
    linkHref: o.linkHref != null ? asSafeHref(o.linkHref, fallback?.linkHref || "") : fallback?.linkHref,
    linkLabel: typeof o.linkLabel === "string" ? o.linkLabel : fallback?.linkLabel,
    sortOrder: asNumber(o.sortOrder, fallback?.sortOrder ?? 0),
  };
}

/** Merge Firestore `hackathonSettings/main` marketing fields with seed defaults. */
export function normalizeHackathonPublicContent(raw?: unknown): HackathonPublicContent {
  const d = DEFAULT_HACKATHON_PUBLIC_CONTENT;
  if (!raw || typeof raw !== "object") {
    return {
      ...d,
      prizes: [...d.prizes],
      rulesSections: [...d.rulesSections],
      judgingCriteria: [...d.judgingCriteria],
      starterLinks: [...d.starterLinks],
      resourceLinks: [...d.resourceLinks],
    };
  }
  const o = raw as Record<string, unknown>;

  const prizes = Array.isArray(o.prizes)
    ? o.prizes.map((row, i) => normalizePrize(row, d.prizes[i])).filter((p): p is HackathonPrizeEntry => Boolean(p))
    : d.prizes;
  const starterLinks = Array.isArray(o.starterLinks)
    ? o.starterLinks
        .map((row, i) => normalizeStarter(row, d.starterLinks[i]))
        .filter((p): p is HackathonStarterLink => Boolean(p))
    : d.starterLinks;
  const rulesSections = Array.isArray(o.rulesSections)
    ? o.rulesSections
        .map((row, i) => normalizeRule(row, d.rulesSections[i]))
        .filter((p): p is RulesSection => Boolean(p))
    : d.rulesSections;
  const resourceLinks = Array.isArray(o.resourceLinks)
    ? o.resourceLinks
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const href = asSafeHref(r.href, "");
          const label = asString(r.label, "");
          if (!href || !label) return null;
          return { href, label };
        })
        .filter((p): p is ContentLink => Boolean(p))
    : d.resourceLinks;
  const judgingCriteria = Array.isArray(o.judgingCriteria)
    ? o.judgingCriteria
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          const title = asString(r.title, "");
          const detail = asString(r.detail, "");
          if (!title || !detail) return null;
          return { title, detail };
        })
        .filter((p): p is JudgingCriterion => Boolean(p))
    : d.judgingCriteria;

  return {
    prizes: prizes.length ? prizes : d.prizes,
    rulesSections: rulesSections.length ? rulesSections : d.rulesSections,
    judgingCriteria: judgingCriteria.length ? judgingCriteria : [...d.judgingCriteria],
    starterLinks: starterLinks.length ? starterLinks : d.starterLinks,
    resourceLinks: resourceLinks.length ? resourceLinks : d.resourceLinks,
    hauntedKioskUrl: asSafeHref(o.hauntedKioskUrl, d.hauntedKioskUrl),
    hauntedKioskBuildUrl: asSafeHref(o.hauntedKioskBuildUrl, d.hauntedKioskBuildUrl),
  };
}
