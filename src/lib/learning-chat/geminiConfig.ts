/**
 * Dedicated Gemini instance for programme learning chat (RAG).
 * Uses LEARNING_GEMINI_API_KEY — separate from any other product keys.
 */

const USER_KEY_MESSAGE =
  "The Learning Assistant is temporarily unavailable. Please try again later, or ask in Discord if this keeps happening.";

export function getLearningGeminiApiKey(): string {
  const key =
    process.env.LEARNING_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_LEARNING_API_KEY?.trim();
  if (!key) {
    // Operator-facing message for server logs / thrown Error.message before formatting.
    throw new Error("LEARNING_GEMINI_API_KEY is not configured");
  }
  return key;
}

export function getLearningGeminiModelId(): string {
  return (
    process.env.LEARNING_GEMINI_MODEL?.trim() ||
    process.env.GEMINI_LEARNING_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

/** Map Gemini / config failures to safe attendee-facing copy (no env var names). */
export function formatLearningGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/quota|429|Quota exceeded/i.test(raw)) {
    return "The Learning Assistant is busy right now. Please wait a moment and try again.";
  }

  if (/LEARNING_GEMINI_API_KEY|GEMINI_LEARNING|API key|API_KEY|not configured|invalid.*key|PERMISSION_DENIED|401|403/i.test(raw)) {
    return USER_KEY_MESSAGE;
  }

  // Never leak stack-like or env-heavy internals to the client.
  if (/ENOENT|\.env|process\.env|private.?key|credential/i.test(raw)) {
    return USER_KEY_MESSAGE;
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
