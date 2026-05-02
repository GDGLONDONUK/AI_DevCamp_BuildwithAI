/**
 * Stable Firestore document ids for `learningTaskTemplates`.
 * POST /api/admin/learning-task-templates/seed merges these into Firestore.
 */
export type LearningTaskTemplateSeedRow = {
  id: string;
  sessionKey: string;
  sessionLabel: string;
  sessionOrder: number;
  title: string;
  category: string;
  sortOrder: number;
};

export const LEARNING_TASK_TEMPLATES_SEED: LearningTaskTemplateSeedRow[] = [
  // Session 1
  {
    id: "bootcamp-s1-langchain-multi-agent-docs",
    sessionKey: "session-1",
    sessionLabel: "Session 1",
    sessionOrder: 1,
    title: "LangChain – Multi-Agent Docs — read",
    category: "resource",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s1-google-cloud-free-credits",
    sessionKey: "session-1",
    sessionLabel: "Session 1",
    sessionOrder: 1,
    title: "Google Cloud — Free Credits — claim",
    category: "resource",
    sortOrder: 20,
  },
  {
    id: "bootcamp-s1-watch-recording",
    sessionKey: "session-1",
    sessionLabel: "Session 1",
    sessionOrder: 1,
    title: "Session 1 — watch recording",
    category: "recording",
    sortOrder: 30,
  },
  // Session 2
  {
    id: "bootcamp-s2-codelab-currency-agent",
    sessionKey: "session-2",
    sessionLabel: "Session 2",
    sessionOrder: 2,
    title: "Codelab — Currency Agent — complete",
    category: "codelab",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s2-codelab-travel-agent",
    sessionKey: "session-2",
    sessionLabel: "Session 2",
    sessionOrder: 2,
    title: "Codelab — Travel Agent — complete",
    category: "codelab",
    sortOrder: 20,
  },
  {
    id: "bootcamp-s2-antigravity-install",
    sessionKey: "session-2",
    sessionLabel: "Session 2",
    sessionOrder: 2,
    title: "Antigravity — install",
    category: "setup",
    sortOrder: 30,
  },
  {
    id: "bootcamp-s2-renuka-first-travel-agent",
    sessionKey: "session-2",
    sessionLabel: "Session 2",
    sessionOrder: 2,
    title: "Renuka's codelab — First Travel Agent — complete",
    category: "codelab",
    sortOrder: 40,
  },
  {
    id: "bootcamp-s2-watch-recording",
    sessionKey: "session-2",
    sessionLabel: "Session 2",
    sessionOrder: 2,
    title: "Session 2 — watch recording",
    category: "recording",
    sortOrder: 50,
  },
  // Session 3
  {
    id: "bootcamp-s3-anthropic-mcp",
    sessionKey: "session-3",
    sessionLabel: "Session 3",
    sessionOrder: 3,
    title: "Anthropic — Model Context Protocol — read",
    category: "resource",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s3-google-cloud-run",
    sessionKey: "session-3",
    sessionLabel: "Session 3",
    sessionOrder: 3,
    title: "Google Cloud Run — Deploy Containerised Apps — complete",
    category: "codelab",
    sortOrder: 20,
  },
  {
    id: "bootcamp-s3-watch-recording",
    sessionKey: "session-3",
    sessionLabel: "Session 3",
    sessionOrder: 3,
    title: "Session 3 — watch recording",
    category: "recording",
    sortOrder: 30,
  },
  // Session 4 — Full-stack multi-agent app (Google ADK & Vertex AI)
  {
    id: "bootcamp-s4-google-adk-docs",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Google ADK — Agent Development Kit — read",
    category: "resource",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s4-vertex-ai-overview",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Vertex AI — Overview & agent tooling — skim",
    category: "resource",
    sortOrder: 15,
  },
  {
    id: "bootcamp-s4-workshop-follow-along",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Live build — Full-stack multi-agent app — follow workshop steps",
    category: "codelab",
    sortOrder: 20,
  },
  {
    id: "bootcamp-s4-adk-sample-repo",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Google ADK samples — clone & run hello-agent locally",
    category: "setup",
    sortOrder: 25,
  },
  {
    id: "bootcamp-s4-multi-agent-architecture-notes",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Sketch your multi-agent architecture (routing, tools, memory)",
    category: "other",
    sortOrder: 30,
  },
  {
    id: "bootcamp-s4-deploy-cloud-run-follow-up",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Deploy one agent path — Cloud Run or ADK deployment docs — attempt",
    category: "codelab",
    sortOrder: 35,
  },
  {
    id: "bootcamp-s4-watch-recording",
    sessionKey: "session-4",
    sessionLabel: "Session 4",
    sessionOrder: 4,
    title: "Session 4 — watch recording",
    category: "recording",
    sortOrder: 40,
  },
  // Session 5
  {
    id: "bootcamp-s5-assignments-review",
    sessionKey: "session-5",
    sessionLabel: "Session 5",
    sessionOrder: 5,
    title: "Assignments — complete outstanding items before showcase",
    category: "other",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s5-watch-recording",
    sessionKey: "session-5",
    sessionLabel: "Session 5",
    sessionOrder: 5,
    title: "Session 5 — watch recording",
    category: "recording",
    sortOrder: 20,
  },
  // Session 6
  {
    id: "bootcamp-s6-closing-demo-prep",
    sessionKey: "session-6",
    sessionLabel: "Session 6",
    sessionOrder: 6,
    title: "Closing ceremony — prepare final project demo",
    category: "other",
    sortOrder: 10,
  },
  {
    id: "bootcamp-s6-watch-recording",
    sessionKey: "session-6",
    sessionLabel: "Session 6",
    sessionOrder: 6,
    title: "Session 6 — closing highlights / recap (if shared)",
    category: "recording",
    sortOrder: 20,
  },
];
