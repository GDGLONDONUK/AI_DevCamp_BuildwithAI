import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const LEARNING_CHAT_LOGS_COLLECTION = "learning_chat_logs";

export type LearningChatLogInput = {
  userId: string;
  userEmail?: string;
  cohortId: string;
  focusSessionId?: string;
  pathname?: string;
  /** Truncated user message for audit (not full long pastes). */
  messagePreview: string;
  messageLength: number;
  historyTurns: number;
  ok: boolean;
  refusedOutOfScope?: boolean;
  error?: string;
  assistantPreview?: string;
  toolsUsed?: string[];
  durationMs: number;
};

function preview(text: string, max = 240): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function logLearningChatCall(input: LearningChatLogInput): Promise<string> {
  const ref = await adminDb().collection(LEARNING_CHAT_LOGS_COLLECTION).add({
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    cohortId: input.cohortId,
    focusSessionId: input.focusSessionId ?? null,
    pathname: input.pathname ?? null,
    messagePreview: preview(input.messagePreview),
    messageLength: input.messageLength,
    historyTurns: input.historyTurns,
    ok: input.ok,
    refusedOutOfScope: input.refusedOutOfScope ?? false,
    error: input.error ?? null,
    assistantPreview: input.assistantPreview
      ? preview(input.assistantPreview)
      : null,
    toolsUsed: input.toolsUsed ?? [],
    durationMs: input.durationMs,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
