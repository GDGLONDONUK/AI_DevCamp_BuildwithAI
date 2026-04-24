/**
 * Browser console logging with less accidental secret / PII exposure in production.
 */

function redactSensitiveFragments(message: string): string {
  return message
    .replace(/Bearer\s+[\w-._~+/]+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key\s*[=:]\s*[\w-]+/gi, "api_key=[redacted]");
}

export function logClientError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, err);
    return;
  }
  if (err instanceof Error) {
    console.error(`[${context}]`, redactSensitiveFragments(err.message));
    return;
  }
  console.error(`[${context}]`, "Request failed");
}
