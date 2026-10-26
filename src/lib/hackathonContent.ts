/**
 * Agentic Hackathon content for AI DevCamp (31 Oct 2026).
 * Adapted from GDG London Hackathon (IO 2026) prizes / rules / resources.
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
  },
  {
    id: "jbl-go",
    name: "JBL Go speaker",
    imageSrc: "/hackathon/prizes/JBL_Go.png",
    featured: true,
    sortOrder: 1,
  },
  {
    id: "wireless-keyboard",
    name: "Wireless keyboard",
    imageSrc: "/hackathon/prizes/Wireless mechanical gaming keyboard.png",
    featured: true,
    sortOrder: 2,
  },
  {
    id: "bag",
    name: "Bag",
    imageSrc: "/hackathon/prizes/Google_bags.png",
    sortOrder: 3,
  },
  {
    id: "google-socks",
    name: "Google socks",
    imageSrc: "/hackathon/prizes/Google_Socks.png",
    sortOrder: 4,
  },
  {
    id: "earbuds",
    name: "Google earbuds",
    imageSrc: "/hackathon/prizes/Google_Ear_buds.png",
    sortOrder: 5,
  },
];

export const HAUNTED_KIOSK_URL = "https://aidevcamp-halloween-hack.vercel.app/";
export const HAUNTED_KIOSK_BUILD_URL = "https://aidevcamp-halloween-hack.vercel.app/build";

export const DEFAULT_RESOURCE_LINKS: ContentLink[] = [
  {
    href: HAUNTED_KIOSK_BUILD_URL,
    label: "Haunted Kiosk · Build lab (Halloween Hack)",
  },
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
    body: "Prizes are handed out live on event day — be there in person to claim them. No mail, no exceptions.\n\nFor team projects, the prize goes to the project leader. How you share it with your team is up to you.",
    variant: "amber",
    icon: "gift",
    sortOrder: 8,
  },
  {
    id: "data",
    kind: "card",
    title: "Your data",
    body: "Submission data is kept for judging and event purposes and is not shared outside the competition.",
    variant: "emerald",
    icon: "database",
    sortOrder: 9,
  },
  {
    id: "deadline",
    kind: "card",
    title: "Submission deadline",
    body: "Saturday, 31 October 2026 — during the Agentic Hackathon (show-and-tell before awards).",
    variant: "violet",
    icon: "clock",
    sortOrder: 10,
  },
];

export const JUDGING_CRITERIA = [
  { title: "Impact", detail: "Does it solve a real problem for a clear audience?" },
  { title: "Technical depth", detail: "Agents, tools, MCP/ADK, deployment — beyond a thin wrapper." },
  { title: "Demo clarity", detail: "Can judges understand and see it working quickly?" },
  { title: "Originality", detail: "Fresh angle, not a copy of a common tutorial." },
] as const;
