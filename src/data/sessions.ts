import { Session } from "@/types";
import {
  SPRING_2026_COHORT_ID,
  SEPTEMBER_2026_COHORT_ID,
  getActiveCohortId,
  sessionsForCohort,
} from "@/lib/cohorts";

/** Spring 2026 (April–May) — completed cohort. */
export const SPRING_2026_SESSIONS: Session[] = [
  {
    id: "session-1",
    number: 1,
    title: "Kick Off",
    date: "23 April 2026",
    time: "6:00 PM",
    duration: "Evening",
    week: 1,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "Kick Off & Intro to AI Agents",
    description:
      "Welcome to AI DevCamp 2026 — Build with AI! We open with Salih Guler (AWS) on building and deploying a Multi-Agent AI Game Master with TypeScript, Michael Tweed (Skyscanner) on how Skyscanner approaches AI agents internally, Sumith Damodaran (Sitecore), and Renuka Kelkar (Arnagen Solutions). We'll walk through the programme structure, what to expect over the coming weeks, assignment and certification details, and distribute cloud credits.",
    speakerIds: ["salih-guler", "michael-tweed", "sumith-damodaran", "renuka-kelkar"],
    isKickoff: true,
    tags: ["Kickoff", "AI Agents", "TypeScript", "Multi-Agent", "Community", "Cloud Credits"],
    whatYouWillLearn: [
      "How to build and deploy a Multi-Agent AI Game Master with TypeScript",
      "How Skyscanner approaches AI agents internally",
      "What AI DevCamp is, what you'll build, and how the programme works",
      "Assignment, project, and certification requirements",
      "How to claim your cloud credits",
    ],
    buildIdeas: [
      "Multi-Agent Game Master (TypeScript)",
      "Your own agent-powered idea inspired by industry examples",
    ],
    resources: [
      {
        title: "Google Cloud – Free Credits for Developers",
        url: "https://cloud.google.com/free",
      },
      {
        title: "LangChain – Multi-Agent Docs",
        url: "https://docs.langchain.com/docs/",
      },
    ],
  },
  {
    id: "session-2",
    number: 2,
    title: "Intro to AI Agents",
    date: "25 April 2026",
    time: "All Day",
    duration: "2 hours",
    week: 1,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "Intro to Agents & Codelabs",
    description:
      "Renuka leads a focused 2-hour hands-on workshop introducing AI agents — how they think, plan, and act. You'll work through 14 guided codelabs that take you from agent fundamentals to practical implementations. By the end of the day you'll have a working understanding of agent loops, tool use, and how to wire them together.",
    speakerIds: ["renuka-kelkar"],
    tags: ["AI Agents", "Codelabs", "Hands-on", "Workshop", "Tool Use", "Agent Loop"],
    whatYouWillLearn: [
      "What an AI agent is and how the agent loop works",
      "How agents use tools to take actions in the world",
      "How to follow and complete structured codelabs",
      "Core agent patterns you'll use throughout the programme",
      "How to set up your local agent development environment",
    ],
    buildIdeas: [
      "Your first working AI agent",
      "Tool-calling agent that searches the web",
      "Simple task-completion agent",
    ],
    resources: [
      {
        title: "Google – Introduction to AI Agents",
        url: "https://cloud.google.com/products/agent-builder",
      },
      {
        title: "LangChain – Agents Documentation",
        url: "https://python.langchain.com/docs/modules/agents/",
      },
    ],
  },
  {
    id: "session-3",
    number: 3,
    title: "MCP, Advanced Agents & Deployment",
    date: "30 April 2026",
    time: "6:00 PM",
    duration: "1 hour + Q&A",
    week: 2,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "MCP · Advanced Agents · Deployment",
    description:
      "Renuka returns for a focused 1-hour session diving into the Model Context Protocol (MCP), advanced agent patterns, and how to deploy your agent to the cloud. We then open the floor for codelab questions and live troubleshooting — bring your blockers!",
    speakerIds: ["renuka-kelkar"],
    tags: ["MCP", "Model Context Protocol", "Deployment", "Advanced Agents", "Q&A", "Codelabs"],
    whatYouWillLearn: [
      "What the Model Context Protocol (MCP) is and why it matters",
      "Advanced agent patterns: memory, planning, multi-step reasoning",
      "How to deploy an AI agent to the cloud",
      "How to debug and extend your codelab agents",
    ],
    buildIdeas: [
      "MCP-powered agent with persistent context",
      "Deployed agent accessible via URL",
      "Multi-step planning agent",
    ],
    resources: [
      {
        title: "Anthropic – Model Context Protocol",
        url: "https://modelcontextprotocol.io/",
      },
      {
        title: "Google Cloud Run – Deploy Containerised Apps",
        url: "https://cloud.google.com/run/docs/quickstarts",
      },
    ],
  },
  {
    id: "session-4",
    number: 4,
    title: "Full-Stack Multi-Agent App",
    date: "2 May 2026",
    time: "All Day",
    duration: "2 hours",
    week: 2,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "Google ADK & Vertex AI",
    description:
      "Saoussen Chaabnia leads a deep 2-hour build session: Full-Stack Multi-Agent App with Google ADK & Vertex AI. You'll go from zero to a deployed multi-agent application backed by Google's Agent Development Kit and powered by Vertex AI — the same stack used in production at scale.",
    speakerIds: ["saoussen-chaabnia"],
    tags: ["Google ADK", "Vertex AI", "Multi-Agent", "Full-Stack", "Build", "Google Cloud"],
    whatYouWillLearn: [
      "How Google's Agent Development Kit (ADK) works",
      "How to connect agents to Vertex AI models",
      "Full-stack architecture for multi-agent applications",
      "How to build, test, and deploy a production-grade agent app",
    ],
    buildIdeas: [
      "Full-stack multi-agent app with Google ADK",
      "Vertex AI-powered research assistant",
      "Multi-agent workflow orchestrator",
    ],
    resources: [
      {
        title: "Google ADK – Agent Development Kit",
        url: "https://google.github.io/adk-docs/",
      },
      {
        title: "Vertex AI – Overview",
        url: "https://cloud.google.com/vertex-ai",
      },
    ],
  },
  {
    id: "session-5",
    number: 5,
    title: "Project Showcase",
    date: "7 May 2026",
    time: "6:00 PM",
    duration: "Evening",
    week: 3,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "Assignment Completion & Project Showcase",
    description:
      "The final stretch before the closing ceremony. We review assignment completion, go through codelab 3, and participants showcase their projects to the group. Get feedback, celebrate your work, and prepare for the in-person closing.",
    speakerIds: [],
    tags: ["Project Showcase", "Assignments", "Codelabs", "Demo", "Feedback"],
    whatYouWillLearn: [
      "How to present and demo an AI agent project clearly",
      "How to complete codelab 3",
      "How to give and receive constructive technical feedback",
    ],
    buildIdeas: ["Your completed final project — any AI agent you've built!"],
    resources: [
      {
        title: "Google – How to Present a Technical Project",
        url: "https://developers.google.com/",
      },
    ],
  },
  {
    id: "session-7",
    number: 6,
    title: "Deep Dive: Agent-to-Agent Protocol",
    date: "9 May 2026",
    time: "6:00 PM",
    duration: "1 hour + Q&A",
    week: 3,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "Deep dive into Agent-to-Agent protocol",
    description:
      "Agent-to-Agent (A2A) protocols define how independent AI agents discover each other, exchange structured messages, and collaborate on tasks across system and organizational boundaries.\n\nIn this talk, we'll go beyond the basics and explore how agents communicate using standardized primitives like Agent Cards, tasks, messages, and artifacts. We'll look at how agents delegate work, negotiate capabilities, and coordinate execution.\n\nWe'll also cover real-world design patterns for building interoperable, multi-agent systems where agents built on different frameworks can seamlessly work together using a common protocol layer.",
    speakerIds: ["nishi-ajmera"],
    tags: [
      "A2A",
      "Agent-to-Agent",
      "Interoperability",
      "Multi-Agent",
      "Agent Cards",
      "Protocols",
    ],
    whatYouWillLearn: [
      "How A2A protocols let agents discover peers and collaborate across organizational boundaries",
      "Agent Cards, tasks, messages, and artifacts as standardized communication primitives",
      "How agents delegate work, negotiate capabilities, and coordinate execution",
      "Design patterns for interoperable multi-agent systems across frameworks",
    ],
    buildIdeas: [
      "Agents that expose or consume an A2A-compatible Agent Card",
      "Multi-agent workflows coordinated through a shared protocol layer",
      "Interoperable agents built on different frameworks working together",
    ],
    resources: [
      {
        title: "A2A Protocol — Specification",
        url: "https://a2aproject.github.io/A2A/latest/specification/",
      },
      {
        title: "A2A — GitHub",
        url: "https://github.com/google/A2A",
      },
    ],
  },
  {
    id: "session-6",
    number: 7,
    title: "Closing & Certificate Ceremony",
    date: "19 May 2026",
    time: "6:00 PM",
    duration: "Evening",
    week: 4,
    cohortId: SPRING_2026_COHORT_ID,
    topic: "In-Person Closing & Certification",
    description:
      "The grand finale of AI DevCamp 2026 — Build with AI! We come together in person (venue TBC) to celebrate everything built over the programme. Certificates are awarded to participants who completed the assignments and project. A night of demos, community, and well-earned recognition.",
    speakerIds: [],
    isClosing: true,
    tags: ["Closing", "Certificate", "In-Person", "Demo Day", "Community", "Celebration"],
    whatYouWillLearn: [
      "How to present your final project to a live audience",
      "What pathways exist to continue building with AI",
    ],
    buildIdeas: ["Your final polished AI agent project"],
    resources: [
      {
        title: "Google Cloud Skills Boost",
        url: "https://cloudskillsboost.google/",
      },
    ],
  },
];

/**
 * September 2026 — Build, Scale, Govern, Optimise (production-ready agent lifecycle).
 * Wed 23 Sept hybrid kickoff includes Build foundations (no separate Thu theory that week);
 * later weeks: Thursday theory (1hr) + Saturday workshop (2hrs).
 */
export const SEPTEMBER_2026_SESSIONS: Session[] = [
  {
    id: "sept-2026-kickoff",
    number: 1,
    title: "Kickoff · Build foundations",
    date: "23 September 2026",
    time: "6:00 PM",
    duration: "3 hours",
    week: 1,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Build",
    description:
      "Hybrid kickoff at Skyscanner + online — one combined session (no separate Thursday theory this week). Speakers: Daniela Petruzalek, Sonika Janagill, Sumith Damodaran, and Renuka Kelkar.\n\nSeries introduction (why the series exists, the four-pillar lifecycle, what you will ship, requirements, support channels, buddy groups and certificate criteria). Build foundations with Sonika: what an agent really is (model, instructions, tools, loop); ADK in one slide (agent types, adk web, six-line hello world); tools (function tools, Google Search, MCP, Agent Skills); choosing a model from Model Garden and pinning Flash-tier models; multi-agent design (orchestrator + specialists); Agent Garden, RAG Engine, AG-UI / CopilotKit; Antigravity and the running use-case architecture demo; short agent-trend speaker teasers; networking in person and on Discord. Live demo of the finished Build-stage app and Saturday's workshop plan.\n\nRunning use case for the cohort: an agent that turns a moment into a LinkedIn/X post with a human always in the loop.",
    speakerIds: ["daniela-petruzalek", "sonika-janagill", "sumith-damodaran", "renuka-kelkar"],
    isKickoff: true,
    tags: [
      "Kickoff",
      "Build",
      "Hybrid",
      "Skyscanner",
      "ADK",
      "MCP",
      "Agent Skills",
      "Antigravity",
      "Multi-Agent",
      "Lifecycle",
    ],
    whatYouWillLearn: [
      "The four-pillar production-ready agent lifecycle: Build, Scale, Govern, Optimise",
      "Agent basics: model, instructions, tools, loop",
      "ADK agent types, adk web, and the local hello-world path",
      "What MCP and Agent Skills are and when to use each",
      "Multi-agent orchestrator + specialists patterns",
      "How Antigravity fits the build workflow",
      "The running use-case architecture you will evolve across four weeks",
    ],
    buildIdeas: [
      "Follow the setup guide and join Discord + buddy groups",
      "Sketch how your use case maps to the lifecycle pillars",
      "Prepare your local ADK environment for Saturday's workshop",
    ],
    resources: [
      { title: "Lab site — AI DevCamp labs", url: "https://sonikajanagill.com/ai-devcamp-labs/" },
      { title: "Labs repo (GitHub)", url: "https://github.com/sonikajanagill/ai-devcamp-labs" },
      {
        title: "Google ADK + Gemini + A2UI Codelab (Daniela)",
        url: "https://codelabs.developers.google.com/adk-gemini-a2ui#0",
      },
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      { title: "Google Cloud – AI agents", url: "https://cloud.google.com/products/agent-builder" },
      { title: "Model Context Protocol", url: "https://modelcontextprotocol.io/" },
    ],
    videoUrl: "https://www.youtube.com/watch?v=bT8zpjTsu4A",
  },
  {
    id: "sept-2026-build-sat",
    number: 2,
    title: "Build — Workshop",
    date: "26 September 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 1,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Build",
    description:
      "Hands-on: build the core agent with ADK. Wire MCP tools for photo and web search. Add audio and text input handling. Stretch: introduce the Flutter app shell for draft review.\n\nYou leave with a working multi-agent app running locally, with tools, Skills, MCP and a web UI — first draft LinkedIn/X post generated (console output; approval flow comes later).",
    speakerIds: ["sonika-janagill"],
    tags: ["Build", "Workshop", "ADK", "MCP", "Codelab", "Hands-on"],
    whatYouWillLearn: [
      "Build a local multi-agent app with ADK",
      "Connect MCP tools for search and media",
      "Handle text and audio input",
      "Ship a first draft post from the agent",
    ],
    buildIdeas: [
      "Working multi-agent app locally",
      "MCP photo + web search tools",
      "Stretch: Flutter draft-review shell",
    ],
    resources: [
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      { title: "Speech-to-Text", url: "https://cloud.google.com/speech-to-text" },
    ],
  },
  {
    id: "sept-2026-scale-thu",
    number: 3,
    title: "Scale — Theory",
    date: "1 October 2026",
    time: "6:00 PM",
    duration: "1 hour",
    week: 2,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Scale",
    description:
      "Why the local app cannot serve real users. Agent Runtime: cold starts, long-running agents, free tier. Deploy options on Agent Platform (Runtime vs Cloud Run vs GKE). Sessions vs Memory Bank. Agent Identity at deploy time. Code Execution sandboxes. Where a custom UI meets a managed runtime. Live demo on Agent Runtime, then Saturday's plan.",
    speakerIds: ["sonika-janagill"],
    tags: ["Scale", "Agent Runtime", "Sessions", "Memory Bank", "Identity", "Theory"],
    whatYouWillLearn: [
      "Limits of local agents in production",
      "What Agent Runtime manages for you",
      "Sessions vs persistent Memory Bank",
      "Agent Identity and why Govern revisits it",
    ],
    buildIdeas: ["Plan the refactor from local app to Runtime deploy"],
    resources: [
      {
        title: "Vertex AI Agent Builder",
        url: "https://cloud.google.com/products/agent-builder",
      },
    ],
  },
  {
    id: "sept-2026-scale-sat",
    number: 4,
    title: "Scale — Workshop",
    date: "3 October 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 2,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Scale",
    description:
      "Refactor the Week 1 agent into a multi-agent pipeline. Implement A2A delegation (orchestrator + specialists: photo-search, web-research, drafting). Deploy to Agent Platform. Test the scaled version end to end.\n\nYou leave with your agent deployed to Agent Runtime with an Agent Identity and persistent sessions.",
    speakerIds: ["sonika-janagill"],
    tags: ["Scale", "Workshop", "A2A", "Agent Platform", "Deploy", "Hands-on"],
    whatYouWillLearn: [
      "Split a monolith agent into orchestrator + specialists",
      "Use A2A-style delegation between agents",
      "Deploy to Agent Runtime with identity and sessions",
    ],
    buildIdeas: [
      "Multi-agent pipeline on Agent Platform",
      "Persistent sessions + Memory Bank",
      "End-to-end scaled run",
    ],
    resources: [
      {
        title: "A2A Protocol",
        url: "https://a2aproject.github.io/A2A/latest/specification/",
      },
    ],
  },
  {
    id: "sept-2026-govern-thu",
    number: 5,
    title: "Govern — Theory",
    date: "8 October 2026",
    time: "6:00 PM",
    duration: "1 hour",
    week: 3,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Govern",
    description:
      "Threat model for this agent (injection, PII, off-brand drafts, posting without approval). Defence in depth: input screening, tool-call policy, output screening, human approval. Governance stack: Identity, Registry, Gateway, Policies. Model Armor in ADK, Cloud DLP, HITL as governance, Skills as policy. Compliance corner. Live demo: injection blocked, PII redacted — then Saturday's plan.",
    speakerIds: ["renuka-kelkar"],
    tags: ["Govern", "Model Armor", "DLP", "Policy", "HITL", "Theory"],
    whatYouWillLearn: [
      "Threat model for agents that take real-world actions",
      "Defence-in-depth governance layers",
      "Model Armor and Cloud DLP in the ADK pipeline",
      "Human-in-the-loop as a control, not polish",
    ],
    buildIdeas: ["Map threats to controls for the LinkedIn/X posting agent"],
    resources: [
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
      {
        title: "Cloud Data Loss Prevention",
        url: "https://cloud.google.com/sensitive-data-protection",
      },
    ],
  },
  {
    id: "sept-2026-govern-sat",
    number: 6,
    title: "Govern — Workshop",
    date: "10 October 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 3,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Govern",
    description:
      "Codelab: add Model Armor checks to the agent pipeline. Build an evaluation set for the drafting agent. Harden the WhatsApp/Discord approval step (reject, timeout, edit). Test against adversarial inputs.\n\nYou leave with a governed agent: screening, PII redaction, policy, registry — and a survived red-team round.",
    speakerIds: ["renuka-kelkar"],
    tags: ["Govern", "Workshop", "Model Armor", "Eval", "Red team", "Hands-on"],
    whatYouWillLearn: [
      "Wire Model Armor before/after model callbacks",
      "Build a golden eval set for on-brand drafts",
      "Harden approval flows for reject / timeout / edit",
      "Adversarial testing before touching a real account",
    ],
    buildIdeas: [
      "Model Armor in the pipeline",
      "Drafting-agent eval set",
      "Hardened approval step",
    ],
    resources: [
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
    ],
  },
  {
    id: "sept-2026-optimise-thu",
    number: 7,
    title: "Optimise — Theory",
    date: "15 October 2026",
    time: "6:00 PM",
    duration: "1 hour",
    week: 4,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Optimise",
    description:
      "Evals as behaviour tests (trajectory vs response, rubrics, golden set). Multi-Turn AutoRaters and online evaluation. Simulation. Observability: Cloud Trace, Unified Trace Viewer, BigQuery Agent Analytics. Prompt optimisation from failure patterns. State and memory as token levers. Cost: tokens, tool calls, runtime; model right-sizing. Evals in the pipeline: push → eval gate → deploy. Live demo, Saturday plan, and graduation slots. Assignment and show-and-tell framing.",
    speakerIds: ["nishi-ajmera"],
    tags: ["Optimise", "Evals", "Observability", "Cost", "CI/CD", "Theory"],
    whatYouWillLearn: [
      "Design golden eval sets and rubric-based judging",
      "Use traces and agent analytics for observability",
      "Right-size models and cut token/tool cost",
      "Put an eval gate in the deploy pipeline",
    ],
    buildIdeas: ["Draft your graduation demo narrative and eval checklist"],
    resources: [
      {
        title: "Vertex AI Evaluation",
        url: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview",
      },
    ],
  },
  {
    id: "sept-2026-optimise-sat",
    number: 8,
    title: "Optimise — Workshop & Graduation",
    date: "17 October 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 4,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Optimise",
    description:
      "Apply cost optimisation (right-size models per sub-agent). Set up a basic CI/CD pipeline with an eval gate. Deploy the final version. Live demos: full agent run end to end — audio/text input to an approved, posted LinkedIn/X post. Graduation demos.\n\nYou leave with a measured agent: golden eval set, traces, analytics, eval-gated deploy.",
    speakerIds: ["nishi-ajmera", "sumith-damodaran", "renuka-kelkar", "sonika-janagill"],
    whatYouWillLearn: [
      "Ship eval-gated deploys for agents",
      "Optimise cost across sub-agents",
      "Demo a production-ready agent end to end",
    ],
    buildIdeas: [
      "Final optimised multi-agent deploy",
      "Graduation demo of the full use case",
    ],
    resources: [
      {
        title: "Cloud Build",
        url: "https://cloud.google.com/build",
      },
    ],
  },
];

/** All cohorts — used by sync / seed scripts. */
export const SESSIONS: Session[] = [
  ...SPRING_2026_SESSIONS,
  ...SEPTEMBER_2026_SESSIONS,
];

/** Sessions for the currently active cohort (home, dashboard, default UI). */
export function getActiveCohortSessions(): Session[] {
  return sessionsForCohort(SESSIONS, getActiveCohortId());
}

export const CURRICULUM_WEEKS = [
  {
    week: 1,
    title: "Build",
    subtitle: "Wed kickoff · Sat workshop",
    color: "from-blue-500 to-blue-700",
    learn: [
      "Agent basics and ADK core concepts",
      "MCP and Agent Skills",
      "Antigravity and the use-case architecture",
      "Local multi-agent app with tools and a web UI",
    ],
    build: [
      "Working multi-agent app running locally",
      "First draft LinkedIn/X post from the agent",
    ],
    timePerDay: "Wed kickoff 3hrs · Sat 2hrs",
    resources: [
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      { title: "Model Context Protocol", url: "https://modelcontextprotocol.io/" },
    ],
  },
  {
    week: 2,
    title: "Scale",
    subtitle: "Agent Runtime · A2A · Identity",
    color: "from-purple-500 to-purple-700",
    learn: [
      "Why local agents fail in production",
      "Agent Runtime, sessions, and Memory Bank",
      "Multi-agent orchestration and A2A",
      "Agent Identity at deploy time",
    ],
    build: [
      "Orchestrator + specialist agents",
      "Deploy to Agent Runtime with persistent sessions",
    ],
    timePerDay: "Thu 1hr · Sat 2hrs",
    resources: [
      {
        title: "A2A Protocol",
        url: "https://a2aproject.github.io/A2A/latest/specification/",
      },
    ],
  },
  {
    week: 3,
    title: "Govern",
    subtitle: "Model Armor · DLP · HITL",
    color: "from-green-500 to-green-700",
    learn: [
      "Threat model and defence in depth",
      "Model Armor and Cloud DLP",
      "Registry, Gateway, and policies",
      "Approval flows and adversarial testing",
    ],
    build: [
      "Governed agent with screening and PII redaction",
      "Hardened approval step + red-team pass",
    ],
    timePerDay: "Thu 1hr · Sat 2hrs",
    resources: [
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
    ],
  },
  {
    week: 4,
    title: "Optimise",
    subtitle: "Evals · Cost · Graduation",
    color: "from-orange-500 to-orange-700",
    learn: [
      "Golden evals and online evaluation",
      "Traces, analytics, and prompt optimisation",
      "Token/cost levers and model right-sizing",
      "Eval-gated CI/CD and graduation demos",
    ],
    build: [
      "Measured agent with eval-gated deploy",
      "Full end-to-end graduation demo",
    ],
    timePerDay: "Thu 1hr · Sat 2hrs",
    resources: [
      {
        title: "Vertex AI Evaluation",
        url: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview",
      },
    ],
  },
];
