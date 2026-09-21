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
import {
  buildLearningChatSystemPrompt,
  isLikelyOutOfScopeLearningQuery,
  LEARNING_CHAT_REFUSE_MESSAGE,
} from "@/lib/learning-chat/scope";

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

function extractToolNames(result: {
  steps?: Array<{ toolCalls?: Array<{ toolName?: string }> }>;
}): string[] {
  const names = new Set<string>();
  for (const step of result.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName) names.add(call.toolName);
    }
  }
  return [...names];
}

export type ProcessLearningChatOutcome = LearningChatResult & {
  refusedOutOfScope?: boolean;
  toolsUsed?: string[];
};

export async function processLearningChat(
  message: string,
  context: LearningChatContext
): Promise<ProcessLearningChatOutcome> {
  if (isLikelyOutOfScopeLearningQuery(message)) {
    return {
      text: LEARNING_CHAT_REFUSE_MESSAGE,
      refusedOutOfScope: true,
      toolsUsed: [],
    };
  }

  try {
    const provider = getProvider();
    const history = (context.history ?? [])
      .filter((m) => m.content.trim().length > 0)
      .slice(-MAX_HISTORY_TURNS);

    const result = await generateText({
      model: provider(getLearningGeminiModelId()),
      system: buildLearningChatSystemPrompt({
        cohortId: context.cohortId,
        focusSessionId: context.focusSessionId,
      }),
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
      toolsUsed: extractToolNames(result),
    };
  } catch (err: unknown) {
    console.error("processLearningChat error:", err);
    return { error: formatLearningGeminiError(err), toolsUsed: [] };
  }
}
