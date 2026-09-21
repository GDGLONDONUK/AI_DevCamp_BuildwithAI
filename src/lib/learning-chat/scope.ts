/**
 * Learning Assistant scope: sessions + programme materials + learning activities only.
 * Never user PII, other attendees, personal tasks, attendance, or admin data.
 */

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(other\s+users?|another\s+user|someone\s+else'?s?|attendees?\s+list|who\s+is\s+enrolled)\b/i,
  /\b(email|phone|linkedin|github)\s+(of|for|address)\b/i,
  /\b(find|lookup|search|show|list|get)\s+(all\s+)?(users?|attendees?|profiles?|emails?)\b/i,
  /\b(my\s+)?(buddy|buddies|pairing)\b/i,
  /\b(attendance|check[\s-]?in\s+code|who\s+attended|mark\s+attendance)\b/i,
  /\b(learning\s+tasks?|my\s+tasks?|task\s+list|checklist)\b/i,
  /\b(assignment\s+grade|who\s+submitted|other\s+people'?s?\s+(project|assignment))\b/i,
  /\b(admin\s+panel|change\s+(my\s+)?role|make\s+(me\s+)?admin)\b/i,
  /\b(password|id\s*token|api\s*key|firebase\s+rules)\b/i,
  /\b(programOptOut|accountDisabled|userStatus)\b/i,
];

export const LEARNING_CHAT_REFUSE_MESSAGE =
  "I can only help with programme learning: sessions, session content (slides, transcripts, videos, concepts), and learning activities in the curriculum. " +
  "I cannot look up other people, personal profiles, private learning tasks, attendance, or admin data. " +
  "Ask about a session topic, summarise a lesson, or clarify a concept instead.";

export function isLikelyOutOfScopeLearningQuery(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return OUT_OF_SCOPE_PATTERNS.some((re) => re.test(text));
}

export function buildLearningChatSystemPrompt(opts: {
  cohortId: string;
  focusSessionId?: string;
}): string {
  return [
    "You are the AI DevCamp Learning Assistant — a programme learning tool only.",
    "ALLOWED topics: session schedule, what was covered in sessions, session materials (PDFs, transcripts, videos, slides, concepts), curriculum learning activities (what you'll learn / build ideas), Ask / Summarize / Translate about that content.",
    "FORBIDDEN: any other user's data; emails; profiles; buddy info; personal learning tasks or checklists; attendance or check-in codes; assignments/projects belonging to others; roles; admin actions; secrets.",
    "If the user asks for forbidden information, refuse briefly and redirect to session/content questions. Do not invent or guess private data.",
    "You have NO tools that access users, learningTasks, attendance, assignments, or projects. Never claim you looked those up.",
    "Prefer search_session_materials and get_session_detail before answering factual questions about the programme.",
    "If materials are missing, say so clearly.",
    "Cite session titles and material kinds when helpful.",
    `Active cohortId: ${opts.cohortId}.`,
    opts.focusSessionId ? `UI focus sessionId: ${opts.focusSessionId}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
