export const SESSION_LEARNING_MATERIALS_COLLECTION = "sessionLearningMaterials";

export type LearningChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type LearningChatContext = {
  uid: string;
  email?: string;
  role: string;
  cohortId: string;
  focusSessionId?: string;
  pathname?: string;
  history?: LearningChatHistoryTurn[];
};

export type LearningChatResult = {
  text?: string;
  sources?: Array<{
    materialId: string;
    title: string;
    kind: string;
    sessionId: string;
  }>;
  error?: string;
};

export const LEARNING_CHAT_WELCOME =
  "Hi — I'm the AI DevCamp learning assistant. Ask what was covered in a session, " +
  "concepts (Agents, MCP, ADK, evals…), or where to find a PDF / transcript / video. " +
  "I use the programme materials corpus (RAG) — I won't invent agenda details.";

export const LEARNING_QUICK_PROMPTS: Array<{ id: string; label: string; message: string }> = [
  {
    id: "kickoff",
    label: "Kickoff coverage",
    message: "What was covered in the kickoff session, and what should I prepare for week 1?",
  },
  {
    id: "mcp",
    label: "Explain MCP",
    message: "Explain MCP in the context of our sessions. Which session covers it and what should I practise?",
  },
  {
    id: "adk",
    label: "Google ADK",
    message: "Summarise Google ADK concepts from our programme materials and link them to the right sessions.",
  },
  {
    id: "week2",
    label: "Week 2 recap",
    message: "Recap week 2 sessions: topics, key concepts, and any slides/transcripts available.",
  },
  {
    id: "resources",
    label: "Find materials",
    message: "List available PDFs, transcripts, and videos for the active cohort sessions.",
  },
];
