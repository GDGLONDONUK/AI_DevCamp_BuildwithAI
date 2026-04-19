import { Session } from "@/types";

export const SESSIONS: Session[] = [
  {
    id: "session-1",
    number: 1,
    title: "Kick Off",
    date: "23 April 2026",
    time: "6:00 PM",
    duration: "Evening",
    week: 1,
    topic: "Kick Off & Intro to AI Agents",
    description:
      "Welcome to AI DevCamp 2026 — Build with AI! We open with two inspiring talks, including Salih's session on building and deploying a Multi-Agent AI Game Master with TypeScript, and a behind-the-scenes look at how Skyscanner is approaching AI agents internally. We'll also walk through the programme structure, what to expect over the coming weeks, assignment and certification details, and distribute cloud credits.",
    speaker: "Salih + Guests",
    speakerTitle: "Lead Organiser & Industry Speakers",
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
    topic: "Intro to Agents & Codelabs",
    description:
      "Renuka leads a focused 2-hour hands-on workshop introducing AI agents — how they think, plan, and act. You'll work through 14 guided codelabs that take you from agent fundamentals to practical implementations. By the end of the day you'll have a working understanding of agent loops, tool use, and how to wire them together.",
    speaker: "Renuka",
    speakerTitle: "AI Engineer & Workshop Lead",
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
        url: "https://cloud.google.com/use-cases/ai-agents",
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
    topic: "MCP · Advanced Agents · Deployment",
    description:
      "Renuka returns for a focused 1-hour session diving into the Model Context Protocol (MCP), advanced agent patterns, and how to deploy your agent to the cloud. We then open the floor for codelab questions and live troubleshooting — bring your blockers!",
    speaker: "Renuka",
    speakerTitle: "AI Engineer & Workshop Lead",
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
    topic: "Google ADK & Vertex AI",
    description:
      "A surprise guest speaker joins us for a deep 2-hour build session: Build a Full-Stack Multi-Agent App with Google ADK & Vertex AI. You'll go from zero to a deployed multi-agent application backed by Google's Agent Development Kit and powered by Vertex AI — the same stack used in production at scale.",
    speaker: "Surprise Speaker",
    speakerTitle: "Industry Expert",
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
    topic: "Assignment Completion & Project Showcase",
    description:
      "The final stretch before the closing ceremony. We review assignment completion, go through codelab 3, and participants showcase their projects to the group. Get feedback, celebrate your work, and prepare for the in-person closing.",
    tags: ["Project Showcase", "Assignments", "Codelabs", "Demo", "Feedback"],
    whatYouWillLearn: [
      "How to present and demo an AI agent project clearly",
      "How to complete codelab 3",
      "How to give and receive constructive technical feedback",
    ],
    buildIdeas: [
      "Your completed final project — any AI agent you've built!",
    ],
    resources: [
      {
        title: "Google – How to Present a Technical Project",
        url: "https://developers.google.com/",
      },
    ],
  },
  {
    id: "session-6",
    number: 6,
    title: "Closing & Certificate Ceremony",
    date: "19 May 2026",
    time: "6:00 PM",
    duration: "Evening",
    week: 4,
    topic: "In-Person Closing & Certification",
    description:
      "The grand finale of AI DevCamp 2026 — Build with AI! We come together in person (venue TBC) to celebrate everything built over the programme. Certificates are awarded to participants who completed the assignments and project. A night of demos, community, and well-earned recognition.",
    isClosing: true,
    tags: ["Closing", "Certificate", "In-Person", "Demo Day", "Community", "Celebration"],
    whatYouWillLearn: [
      "How to present your final project to a live audience",
      "What pathways exist to continue building with AI",
    ],
    buildIdeas: [
      "Your final polished AI agent project",
    ],
    resources: [
      {
        title: "Google Cloud Skills Boost",
        url: "https://cloudskillsboost.google/",
      },
    ],
  },
];

export const CURRICULUM_WEEKS = [
  {
    week: 1,
    title: "AI Agents Foundations",
    subtitle: "Kickoff + Workshop",
    color: "from-blue-500 to-blue-700",
    learn: [
      "What AI agents are and how they work",
      "The agent loop: perceive → reason → act",
      "Tool use and function calling",
      "14 guided codelabs",
    ],
    build: ["Your first working AI agent", "Tool-calling agent"],
    timePerDay: "1–2 hrs/day",
    resources: [
      {
        title: "Google – Introduction to AI Agents",
        url: "https://cloud.google.com/use-cases/ai-agents",
      },
    ],
  },
  {
    week: 2,
    title: "Advanced Agents & Full-Stack",
    subtitle: "MCP · ADK · Vertex AI",
    color: "from-purple-500 to-purple-700",
    learn: [
      "Model Context Protocol (MCP)",
      "Advanced agent patterns and memory",
      "Google Agent Development Kit (ADK)",
      "Vertex AI and cloud deployment",
    ],
    build: ["MCP agent", "Full-stack multi-agent app with Google ADK"],
    timePerDay: "1.5–2 hrs/day",
    resources: [
      {
        title: "Anthropic – Model Context Protocol",
        url: "https://modelcontextprotocol.io/",
      },
      {
        title: "Google ADK – Agent Development Kit",
        url: "https://google.github.io/adk-docs/",
      },
    ],
  },
  {
    week: 3,
    title: "Projects & Showcase",
    subtitle: "Build · Demo · Feedback",
    color: "from-green-500 to-green-700",
    learn: [
      "Complete codelabs 3",
      "Finalise your project",
      "Present and demo your work",
      "Give and receive technical feedback",
    ],
    build: ["Your final AI agent project"],
    timePerDay: "2+ hrs/day",
    resources: [
      {
        title: "Google Cloud Run – Deploy Apps",
        url: "https://cloud.google.com/run/docs/quickstarts",
      },
    ],
  },
  {
    week: 4,
    title: "Closing & Certification",
    subtitle: "In-Person Ceremony",
    color: "from-orange-500 to-orange-700",
    learn: [
      "Live project demos",
      "Certificate award ceremony",
      "Community celebration",
      "Next steps in AI",
    ],
    build: ["Your polished final project demo"],
    timePerDay: "Event night",
    resources: [
      {
        title: "Google Cloud Skills Boost",
        url: "https://cloudskillsboost.google/",
      },
    ],
  },
];
