import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ZodType, output } from "zod";
import { err } from "@/lib/api-helpers";

function formatZodIssues(issues: { path: (string | number)[]; message: string }[]): string {
  return issues
    .map((i) => {
      const p = i.path.length ? i.path.join(".") : "body";
      return `${p}: ${i.message}`;
    })
    .join("; ");
}

/**
 * Parse JSON and validate with a Zod schema. Returns a 400 response on invalid JSON or validation failure.
 */
export async function parseJsonBody<T extends ZodType>(
  request: NextRequest,
  schema: T
): Promise<
  { ok: true; data: output<T> } | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: err("Invalid JSON body", 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = formatZodIssues(result.error.issues as { path: (string | number)[]; message: string }[]);
    return { ok: false, response: err(message || "Validation failed", 400) };
  }

  return { ok: true, data: result.data };
}
