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
  buildLearningChatDryRunPlan,
  LEARNING_HARNESS,
  trimHistoryTurns,
  type LearningHarnessDryRunPlan,
} from "@/lib/learning-chat/harness";
import {
  buildLearningChatSystemPrompt,
  isLikelyOutOfScopeLearningQuery,
  LEARNING_CHAT_REFUSE_MESSAGE,
} from "@/lib/learning-chat/scope";

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
  stepCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  dryRunPlan?: LearningHarnessDryRunPlan;
};

export async function processLearningChat(
  message: string,
  context: LearningChatContext,
  opts?: { dryRun?: boolean }
): Promise<ProcessLearningChatOutcome> {
  const refused = isLikelyOutOfScopeLearningQuery(message);

  if (opts?.dryRun) {
    return {
      text: refused ? LEARNING_CHAT_REFUSE_MESSAGE : undefined,
      refusedOutOfScope: refused,
      toolsUsed: [],
      dryRunPlan: buildLearningChatDryRunPlan({
        message,
        cohortId: context.cohortId,
        focusSessionId: context.focusSessionId,
        historyTurns: context.history?.length ?? 0,
        refusedOutOfScope: refused,
      }),
    };
  }

  if (refused) {
    return {
      text: LEARNING_CHAT_REFUSE_MESSAGE,
      refusedOutOfScope: true,
      toolsUsed: [],
    };
  }

  try {
    const provider = getProvider();
    const history = trimHistoryTurns(context.history);

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
      stopWhen: stepCountIs(LEARNING_HARNESS.maxToolSteps),
    });

    const usage = result.usage as
      | { promptTokens?: number; completionTokens?: number; inputTokens?: number; outputTokens?: number }
      | undefined;

    return {
      text:
        result.text ||
        "I looked at the materials but have nothing further to add. Try a more specific session or concept.",
      toolsUsed: extractToolNames(result),
      stepCount: result.steps?.length ?? 0,
      promptTokens: usage?.promptTokens ?? usage?.inputTokens,
      completionTokens: usage?.completionTokens ?? usage?.outputTokens,
    };
  } catch (err: unknown) {
    console.error("processLearningChat error:", err);
    return { error: formatLearningGeminiError(err), toolsUsed: [] };
  }
}
