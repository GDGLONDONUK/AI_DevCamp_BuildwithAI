/** JSON-safe stringify for MCP tool results (handles Firestore Timestamps). */
export function toJsonText(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object") {
      if (typeof (v as { toDate?: () => Date }).toDate === "function") {
        try {
          return (v as { toDate: () => Date }).toDate().toISOString();
        } catch {
          return String(v);
        }
      }
      if (typeof (v as { _seconds?: number })._seconds === "number") {
        const sec = (v as { _seconds: number })._seconds;
        return new Date(sec * 1000).toISOString();
      }
    }
    return v;
  }, 2);
}

export function okResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: toJsonText(data) }],
  };
}

export function errResult(message: string) {
  return {
    content: [{ type: "text" as const, text: toJsonText({ error: message }) }],
    isError: true as const,
  };
}
