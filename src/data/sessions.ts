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
      "Hands-on Build workshop with Sonika Janagill. Set up Google Cloud (new project, free credits, billing alerts, and a Vertex AI spend cap), then local tools: gcloud CLI, uv, Python, Node, compute region us-central1, and model location global.\n\nBuild an ADK agent with agent CLI and the playground. The running example is a social-post agent: a root orchestrator, a research agent (Google Search), a draft agent, Agent Skills (brand voice, platform limits, post format), image generation, and human confirmation before anything is published. Buffer MCP posts to X or LinkedIn; a small custom MCP is the optional LinkedIn path. The web UI is CopilotKit (AG-UI) on localhost:3000, talking to the agent as an API.\n\nYou leave with a local ADK app that can research, draft, and post only after you approve. Live audio/video is a stretch (pinned live model, region us-central1, higher cost — test in text first). Evals and Agent Platform deploy come in later weeks.",
    speakerIds: ["sonika-janagill"],
    tags: ["Build", "Workshop", "ADK", "MCP", "Agent Skills", "CopilotKit", "Hands-on"],
    whatYouWillLearn: [
      "Create a Google Cloud project, billing alerts, and a Vertex AI spend cap",
      "Install gcloud, uv, Python, and Node; use us-central1 for compute and global for model aliases",
      "Scaffold an ADK agent with agent CLI and run it in the playground",
      "Shape output with Agent Skills (brand voice, platform style, post format)",
      "Split work across an orchestrator, a research agent, and a draft agent",
      "Require human confirmation before a tool posts",
      "Connect Buffer MCP, and optionally a custom LinkedIn MCP",
      "Serve the agent as an API and a CopilotKit streaming UI",
    ],
    buildIdeas: [
      "Finish the setup guide and run ADK web locally",
      "Clone the labs repo (starter or the pillar-build tag) and complete the Build lab",
      "Add one Agent Skill of your own",
      "Create a Buffer API key and publish a draft only after you approve it",
      "Stretch: switch to a live audio/video model on us-central1, or wire the Cloud Storage image URL",
    ],
    resources: [
      { title: "Session recording (YouTube)", url: "https://www.youtube.com/watch?v=7CcQwBGOHEY" },
      { title: "CopilotKit", url: "https://www.copilotkit.ai/" },
      { title: "Lab site — AI DevCamp labs", url: "https://sonikajanagill.com/ai-devcamp-labs/" },
      { title: "Labs repo (GitHub)", url: "https://github.com/sonikajanagill/ai-devcamp-labs" },
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      { title: "ADK live agents (audio/video)", url: "https://adk.dev/live/" },
    ],
    videoUrl: "https://www.youtube.com/watch?v=7CcQwBGOHEY",
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
      "Scale theory with Sonika Janagill. Scale means many people can use the agent at once without it crashing or running out of resources — off a laptop, with sessions, identity, and logging.\n\nRecap of Build: ADK (model, instructions, MCP tools, Agent Skills), a multi-agent orchestrator for research, drafting, and posting, and a CopilotKit UI on AG-UI. Then Agent Platform's scale stage: Agent Runtime (warm start under a second, long-running work up to 7 days, up to 3,000 agents per project, five deploy paths), sessions versus Memory Bank (embedding search, 90-day topic TTL, separate banks per agent and user), code sandboxes including computer use, and Agent Identity so actions are not only attributed to a person.\n\nThe web UI stays private on Cloud Run behind Identity-Aware Proxy; the runtime API is called with bearer tokens. Do not hard-code service accounts. Saturday's workshop is deploying the app you already run locally. Weekly submission is the lab plus your own parallel agent.",
    speakerIds: ["sonika-janagill"],
    tags: ["Scale", "Agent Runtime", "Sessions", "Memory Bank", "Identity", "Theory"],
    whatYouWillLearn: [
      "Why a local agent cannot serve concurrent users",
      "What Agent Runtime hosts for you: scaling, IAM, streaming, and traffic splitting",
      "Five ways to deploy: Dockerfile, linked repo, source upload, Artifact Registry, or the Agent Platform SDK",
      "Sessions for this conversation versus Memory Bank for long-term recall",
      "Sandboxes and computer use when there is no API",
      "Agent Identity so each agent has its own IAM credentials",
      "How a private UI calls the runtime with bearer tokens instead of hard-coded keys",
    ],
    buildIdeas: [
      "Have the Build-stage app running locally before Saturday's deploy workshop",
      "Submit this week's lab and keep developing your own parallel agent",
    ],
    resources: [
      {
        title: "Session recording (YouTube)",
        url: "https://www.youtube.com/watch?v=YSm5HeNw9oo",
      },
      {
        title: "Vertex AI Agent Builder",
        url: "https://cloud.google.com/products/agent-builder",
      },
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      { title: "CopilotKit", url: "https://www.copilotkit.ai/" },
    ],
    videoUrl: "https://www.youtube.com/watch?v=YSm5HeNw9oo",
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
      "Saturday Scale lab with Sonika Janagill. Build a multi-agent app in Agent Studio (no code required), then copy the generated ADK project and deploy it with the agent CLI. The deploy uses a manifest and an Agent Identity (a cryptographic principal, not a shared service account).\n\nAfter deploy: call the runtime with curl or Postman (OpenAPI, bearer token), turn on sessions so conversations and traces stay in the console, and attach a Memory Bank scoped per agent and per user. A Cloud Run front end connects with a backend-origin URL; gcloud run services proxy reaches a private service on a local port. FastAPI in main.py wraps the agent when you need your own API.\n\nAgent Studio is text-only today. Live audio and video stay on local ADK. Vector Search syncs indexes for you; a RAG corpus does not — re-sync files yourself. Week 2 submission is two deploys: your agent and the social poster (screenshot or GitHub link on Discord). Agent Runtime is on a free tier through the end of 2026; delete Cloud Run services and agents you are not using.",
    speakerIds: ["sonika-janagill"],
    tags: ["Scale", "Workshop", "Agent Studio", "Agent Runtime", "Sessions", "Memory Bank", "Hands-on"],
    whatYouWillLearn: [
      "Scaffold a multi-agent app in Agent Studio and take the generated ADK code locally",
      "Deploy with agents-cli from the folder that contains agents-cli-manifest.yaml",
      "Use Agent Identity instead of a shared service account",
      "Call the deployed agent with curl or Postman using a bearer token",
      "Record sessions and traces, and save long-term memory per user and agent",
      "Point a Cloud Run or FastAPI front end at the runtime",
    ],
    buildIdeas: [
      "Deploy one agent from Agent Studio or from a local ADK repo",
      "Deploy the social poster with a front end",
      "Submit both: a screenshot or a GitHub link on Discord",
    ],
    resources: [
      {
        title: "Session recording (YouTube)",
        url: "https://www.youtube.com/watch?v=0MEwAaKtxm0",
      },
      {
        title: "Vertex AI Agent Builder",
        url: "https://cloud.google.com/products/agent-builder",
      },
      { title: "Google ADK docs", url: "https://google.github.io/adk-docs/" },
      {
        title: "A2A Protocol",
        url: "https://a2aproject.github.io/A2A/latest/specification/",
      },
    ],
    videoUrl: "https://www.youtube.com/watch?v=0MEwAaKtxm0",
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
      "Govern theory with Nishi Ajmera. Why agents need boundaries: Gartner-style risk that projects fail without controls; threats of prompt injection, PII leakage, off-brand drafts, and actions without approval.\n\nDefence in depth: input screening, tool-call policy, output screening, and human-in-the-loop. Platform stack: Agent Identity (SPIFFE, mTLS + DPoP, OAuth manager), Registry, IAM / Model Armor / semantic policies, Agent Gateway (ingress and egress), and observability. Code path: ADK before/after model and tool-result callbacks with fail-close. Cloud DLP for redact/de-identify on input and draft. Approval gates that hash the draft, re-screen edits, timeout closed, and stay idempotent. Soft skills (markdown) never replace hard controls.\n\nSaturday lab plan (later moved): fresh deploy, Model Armor, DLP, then try to break it.",
    speakerIds: ["nishi-ajmera"],
    tags: ["Govern", "Model Armor", "DLP", "Policy", "HITL", "Theory"],
    whatYouWillLearn: [
      "Threat model for agents that take real-world actions",
      "Five control building blocks: identity, registry, policy, gateway, observability",
      "Model Armor (statistical) vs IAM (deterministic) vs semantic rules",
      "Cloud DLP for PII on ingress and on final drafts",
      "Approval gates as hard tool controls, not only UI buttons",
    ],
    buildIdeas: [
      "Map the LinkedIn/X posting agent to identity, registry, policies, and gateway",
      "Plan where before-model / after-model / tool-result screens sit in your code",
    ],
    resources: [
      {
        title: "Session recording (YouTube)",
        url: "https://www.youtube.com/watch?v=frr_WZcqb54",
      },
      {
        title: "Slides (Canva) — Renuka / Govern materials",
        url: "https://canva.link/g56lm40w274w9ee",
      },
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
      {
        title: "Cloud Data Loss Prevention",
        url: "https://cloud.google.com/sensitive-data-protection",
      },
    ],
    videoUrl: "https://www.youtube.com/watch?v=frr_WZcqb54",
  },
  {
    id: "sept-2026-govern-sat",
    number: 6,
    title: "Govern — Workshop (cancelled)",
    date: "10 October 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 3,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Govern",
    description:
      "This Saturday workshop was cancelled. Hands-on Govern (Model Armor, registry, policies, gateway) moved to Thursday 15 October — see that session for the recording and Renuka’s governance lab site.",
    speakerIds: ["renuka-kelkar"],
    tags: ["Govern", "Cancelled"],
    whatYouWillLearn: [
      "Workshop cancelled — use the 15 October Govern workshop instead",
    ],
    buildIdeas: [
      "Follow the 15 October Govern workshop recording and lab",
    ],
    resources: [
      {
        title: "Govern workshop (moved) — recording",
        url: "https://www.youtube.com/watch?v=860gVUhsSuw",
      },
      {
        title: "Agent Governance Lab (Renuka)",
        url: "https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3",
      },
    ],
    videoUrl: "https://www.youtube.com/watch?v=860gVUhsSuw",
  },
  {
    id: "sept-2026-optimise-thu",
    number: 7,
    title: "Govern — Workshop",
    date: "15 October 2026",
    time: "6:00 PM",
    duration: "2 hours",
    week: 3,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Govern",
    description:
      "Hands-on Govern with Renuka Kelkar (moved here after the 10 October Saturday was cancelled). Simple blog-writer agent (root orchestrator, search sub-agent, image sub-agent) used to show Model Armor templates in us-central1, ingress/egress guards, DLP for sensitive data, Agent Identity before Registry, access vs business policies, and Agent Gateway as the check-post.\n\nCodelab feedback: copy-paste prompts give a skeleton; learn by building your own agent step by step. Use the governance lab site for guided lessons. Submit demos as video or screenshots if you do not want a public URL that keeps Cloud spend open. Optimisation deep-dive continues on 17 October; further sessions planned for 22 October and the 31 October hackathon.",
    speakerIds: ["renuka-kelkar"],
    tags: ["Govern", "Workshop", "Model Armor", "DLP", "Registry", "Hands-on"],
    whatYouWillLearn: [
      "Create Model Armor templates (injection, jailbreak, responsible AI) and redeploy",
      "Apply DLP so PII does not enter or leave the agent",
      "Register an agent only after Agent Identity exists",
      "Write access and business policies (e.g. education-only blogs)",
      "Place the Agent Gateway after policies are defined",
    ],
    buildIdeas: [
      "Finish the Social Spark govern codelab",
      "Walk Renuka’s Agent Governance Lab lessons",
      "Add Model Armor + identity + one business policy to your own agent",
    ],
    resources: [
      {
        title: "Session recording (YouTube)",
        url: "https://www.youtube.com/watch?v=860gVUhsSuw",
      },
      {
        title: "Agent Governance Lab (Renuka)",
        url: "https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3",
      },
      {
        title: "Slides (Canva)",
        url: "https://canva.link/g56lm40w274w9ee",
      },
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
    ],
    videoUrl: "https://www.youtube.com/watch?v=860gVUhsSuw",
  },
  {
    id: "sept-2026-optimise-sat",
    number: 8,
    title: "Optimise — Workshop",
    date: "17 October 2026",
    time: "10:00 AM",
    duration: "2 hours",
    week: 4,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Optimise",
    /** Closing / demo day / graduation is the 31 Oct hackathon — not this workshop. */
    isClosing: false,
    description:
      "Optimise workshop with Renuka Kelkar, plus programme wrap notes from Sumith Damodaran. Building an agent is easy; harnessing it for production is the hard part — track tokens, tool calls, and retries, validate outputs, and measure before you spend.\n\nPatterns: split multi-agent work; put deterministic steps in tools and skills (not repeated LLM calls); dry-run with mocks or on-device models; right-size models per sub-agent; shrink context with memory/DB; structure outputs; cache; turn off unnecessary “thought” tokens in Agent Studio. Renuka’s video-agent experiment hit about £100 in a day before those changes cut usage sharply (example: ~492 tokens after tool-based stitching).\n\nDemo day, pitching, certificates, and the award ceremony are on the cohort closing Agentic Hackathon — Saturday 31 October (see /hackathon and Luma).",
    speakerIds: ["renuka-kelkar", "sumith-damodaran"],
    tags: ["Optimise", "Cost", "Harnessing", "Hands-on"],
    whatYouWillLearn: [
      "Separate building an agent from harnessing it in production",
      "Measure tokens, tool calls, retries, and failures",
      "Cut cost with tools/skills, right-sized models, smaller context, and caching",
      "Use dry runs and mocks before live Vertex calls",
      "Leave ready to continue polishing for the 31 October hackathon",
    ],
    buildIdeas: [
      "Apply at least three optimisation patterns to your agent",
      "Keep refining your project toward the 31 October hackathon",
      "Register on the hackathon Luma page when ready",
    ],
    resources: [
      {
        title: "Session recording (YouTube)",
        url: "https://www.youtube.com/watch?v=xLBJ1k_kh5o",
      },
      {
        title: "Agentic Hackathon (Luma)",
        url: "https://luma.com/wz7509ty",
      },
      {
        title: "Agent Governance Lab (Renuka)",
        url: "https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3",
      },
      {
        title: "Vertex AI Evaluation",
        url: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview",
      },
    ],
    videoUrl: "https://www.youtube.com/watch?v=xLBJ1k_kh5o",
  },
  {
    id: "sept-2026-hackathon",
    number: 9,
    title: "Agentic Hackathon · Closing & Certificates",
    date: "31 October 2026",
    time: "9:00 AM",
    duration: "8 hours",
    week: 4,
    cohortId: SEPTEMBER_2026_COHORT_ID,
    topic: "Hackathon",
    description:
      "Cohort closing day: AI DevCamp 2026 Agentic AI Hackathon with Google ADK, hosted by GDG London. In person at Encode Hub, London, and online. Solo or team. Build from idea toward an end-to-end agent, join expert sessions, then show-and-tell, pitch, and receive certificates.\n\nDay plan: 9:00–12:00 kick-off and build · 12:00–2:00 expert sessions · 2:00–4:00 continue building and polish demos · 4:00–5:00 showcases, pitching, closing and certificate ceremony. Bring a laptop and charger. Hackathon rules and submission criteria are emailed; submit your final project on the portal as well as registering on Luma.",
    speakerIds: ["sumith-damodaran", "renuka-kelkar"],
    isClosing: true,
    tags: [
      "Hackathon",
      "Closing",
      "Certificate",
      "Show and tell",
      "In-Person",
      "Online",
      "ADK",
    ],
    whatYouWillLearn: [
      "Ship an end-to-end ADK agent under hackathon time pressure",
      "Present and pitch your agent in a show-and-tell",
      "Collaborate solo or in a team with mentors on site and online",
    ],
    buildIdeas: [
      "Register on Luma (in person or online)",
      "Submit your final project on the portal before or on the day",
      "Prepare a short demo and pitch for 4:00–5:00 PM",
    ],
    resources: [
      {
        title: "Register on Luma",
        url: "https://luma.com/wz7509ty",
      },
      {
        title: "Hackathon page (this site)",
        url: "https://aidevcamp.gdg.london/hackathon",
      },
      {
        title: "Submit final project",
        url: "https://aidevcamp.gdg.london/submit",
      },
      {
        title: "Google ADK docs",
        url: "https://google.github.io/adk-docs/",
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
    subtitle: "Theory 8 Oct · Workshop 15 Oct (10 Oct cancelled)",
    color: "from-green-500 to-green-700",
    learn: [
      "Threat model and defence in depth",
      "Model Armor, Cloud DLP, identity, registry, gateway",
      "Access vs business policies and HITL approval",
      "Govern lab with Renuka’s guided site",
    ],
    build: [
      "Governed agent with screening and PII redaction",
      "Identity + registry + at least one business policy",
    ],
    timePerDay: "Thu 8 Oct 1hr · Thu 15 Oct 2hrs (Sat 10 Oct cancelled)",
    resources: [
      {
        title: "Model Armor",
        url: "https://cloud.google.com/security/products/model-armor",
      },
      {
        title: "Agent Governance Lab",
        url: "https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3",
      },
    ],
  },
  {
    week: 4,
    title: "Optimise",
    subtitle: "Cost · Harnessing · Hackathon closing 31 Oct",
    color: "from-orange-500 to-orange-700",
    learn: [
      "Harnessing vs building: measure tokens and tool calls",
      "Tools/skills, right-sized models, smaller context, caching",
      "Dry runs before live Vertex spend",
      "31 Oct Agentic Hackathon — show-and-tell, pitch, certificates",
    ],
    build: [
      "Optimised agent ready to demo or pitch",
      "Hackathon + portal final project submission",
    ],
    timePerDay: "Sat 17 Oct · Sat 31 Oct hackathon 9–5",
    resources: [
      {
        title: "Agentic Hackathon (Luma)",
        url: "https://luma.com/wz7509ty",
      },
      {
        title: "Vertex AI Evaluation",
        url: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview",
      },
    ],
  },
];
