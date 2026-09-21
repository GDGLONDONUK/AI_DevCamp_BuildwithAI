/**
 * Dedicated Gemini instance for programme learning chat (RAG).
 * Uses LEARNING_GEMINI_API_KEY — separate from any other product keys.
 */

export function getLearningGeminiApiKey(): string {
  const key =
    process.env.LEARNING_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_LEARNING_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "LEARNING_GEMINI_API_KEY is not configured. Add a dedicated Gemini key to .env.local."
    );
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

export function formatLearningGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/quota|429|Quota exceeded/i.test(raw)) {
    return (
      "Learning Gemini quota exceeded. Try LEARNING_GEMINI_MODEL=gemini-2.0-flash-lite " +
      "or wait and retry. https://ai.dev/rate-limit"
    );
  }

  if (/LEARNING_GEMINI_API_KEY|API key|API_KEY/i.test(raw)) {
    return "LEARNING_GEMINI_API_KEY is missing or invalid. Add it to .env.local and restart.";
  }

  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
}
