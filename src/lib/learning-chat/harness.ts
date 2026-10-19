/**
 * Learning Assistant harness — Optimise-week principles applied to *this* product.
 *
 * Kitchen-sink map (see docs/15-agent-harnessing-optimisation.md):
 *  - Input control → Zod + scope refuse (no LLM for out-of-scope)
 *  - Config over prompts → limits & model id here / env (not in system text)
 *  - Tools execute → toolExecutors + studyAids (deterministic RAG / cards / quiz)
 *  - Dry-run → plan without calling Gemini
 *  - Measure → learning_chat_logs (tools, steps, tokens, duration)
 *  - Right-size model → Flash-tier default (LEARNING_GEMINI_MODEL)
 *  - Shrink context → history cap + excerpt-only tool results
 *  - Structured study aids → JSON cards/quiz from code, not free-form invent
 *
 * Not one giant agent: HTTP chat tools ≠ MCP public ≠ MCP study ≠ MCP admin ≠ maintainer skills.
 */

export const LEARNING_HARNESS = {
  /** Cheap / Flash-tier default; override with LEARNING_GEMINI_MODEL. */
  defaultModelHint: "gemini-3.8-flash",
  maxMessageChars: 4000,
  maxHistoryTurns: 8,
  maxHistoryContentChars: 8000,
  maxToolSteps: 8,
  maxSearchHits: 12,
  excerptChars: 500,
  listPreviewChars: 280,
} as const;

export type LearningHarnessDryRunPlan = {
  status: "dry_run";
  wouldCallModel: boolean;
  modelEnv: string;
  limits: typeof LEARNING_HARNESS;
  input: {
    messageLength: number;
    historyTurnsKept: number;
    focusSessionId: string | null;
    cohortId: string;
  };
  toolSurface: string[];
  notes: string[];
};

/** Tools exposed to the in-app Learning Assistant (not MCP admin / my-tasks). */
export const LEARNING_CHAT_TOOL_NAMES = [
  "list_cohort_sessions",
  "get_session_detail",
  "search_session_materials",
  "list_session_materials",
  "get_focus_hint",
  "prepare_flashcards",
  "prepare_quiz",
  "start_learning_guide",
] as const;

export function trimHistoryTurns<T extends { content: string }>(
  history: T[] | undefined,
  maxTurns = LEARNING_HARNESS.maxHistoryTurns
): T[] {
  return (history ?? [])
    .filter((m) => m.content.trim().length > 0)
    .slice(-maxTurns);
}

export function buildLearningChatDryRunPlan(opts: {
  message: string;
  cohortId: string;
  focusSessionId?: string;
  historyTurns: number;
  refusedOutOfScope: boolean;
}): LearningHarnessDryRunPlan {
  return {
    status: "dry_run",
    wouldCallModel: !opts.refusedOutOfScope,
    modelEnv: "LEARNING_GEMINI_MODEL",
    limits: LEARNING_HARNESS,
    input: {
      messageLength: opts.message.length,
      historyTurnsKept: Math.min(opts.historyTurns, LEARNING_HARNESS.maxHistoryTurns),
      focusSessionId: opts.focusSessionId ?? null,
      cohortId: opts.cohortId,
    },
    toolSurface: [...LEARNING_CHAT_TOOL_NAMES],
    notes: [
      "Out-of-scope messages never call Gemini (input control).",
      "RAG / flashcards / quiz are built in tools — model decides, code executes.",
      "MCP hosts use the same executors but specialist tool packs (public / learning / study / tasks / admin).",
      "Maintainer .claude/skills edit the repo; attendees use /faq + /mcp + in-app chat.",
    ],
  };
}
