import "server-only";

import { generateText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  formatLearningGeminiError,
  getLearningGeminiApiKey,
  getLearningGeminiModelId,
} from "@/lib/learning-chat/geminiConfig";
import type {
  LearningChatContext,
  LearningChatResult,
} from "@/lib/learning-chat/constants";
import { buildLearningChatTools } from "@/lib/learning-chat/tools";

const MAX_TOOL_STEPS = 8;
const MAX_HISTORY_TURNS = 8;

let providerSingleton: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getProvider() {
  if (!providerSingleton) {
    providerSingleton = createGoogleGenerativeAI({
      apiKey: getLearningGeminiApiKey(),
    });
  }
  return providerSingleton;
}

function buildSystemPrompt(ctx: LearningChatContext): string {
  return [
    "You are the AI DevCamp learning assistant for GDG London attendees.",
    "Answer using tools that read programme sessions and the learning materials corpus (transcripts, PDFs, videos, concepts).",
    "Prefer search_session_materials and get_session_detail before answering factual questions.",
    "Support Ask / Summarize / Translate: clarify concepts, summarise lesson takeaways, and reply in the learner's language when they write in another language.",
    "If materials are missing, say so clearly and point to session description / resources when available.",
    "Do not invent attendance records, grades, or private user data.",
    "Cite session titles and material kinds when helpful.",
    `Active cohortId: ${ctx.cohortId}.`,
    ctx.focusSessionId ? `UI focus sessionId: ${ctx.focusSessionId}.` : "",
    `Caller role: ${ctx.role}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function processLearningChat(
  message: string,
  context: LearningChatContext
): Promise<LearningChatResult> {
  try {
    const provider = getProvider();
    const history = (context.history ?? [])
      .filter((m) => m.content.trim().length > 0)
      .slice(-MAX_HISTORY_TURNS);

    const result = await generateText({
      model: provider(getLearningGeminiModelId()),
      system: buildSystemPrompt(context),
      messages: [
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: message,
        },
      ],
      tools: buildLearningChatTools(context),
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
    });

    return {
      text:
        result.text ||
        "I looked at the materials but have nothing further to add. Try a more specific session or concept.",
    };
  } catch (err: unknown) {
    console.error("processLearningChat error:", err);
    return { error: formatLearningGeminiError(err) };
  }
}
