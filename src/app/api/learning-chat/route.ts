/**
 * POST /api/learning-chat — signed-in attendees & admins; dedicated Gemini + RAG tools.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, isErrorResponse, ok, err } from "@/lib/api-helpers";
import { processLearningChat } from "@/lib/learning-chat/chatService";
import { getActiveCohortId } from "@/lib/cohorts";
import { logServerRouteException } from "@/lib/server/appErrorLog";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  focusSessionId: z.string().trim().max(120).optional(),
  pathname: z.string().trim().max(200).optional(),
  cohortId: z.string().trim().max(80).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .max(16)
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid request");
    }

    const { message, focusSessionId, pathname, history, cohortId } = parsed.data;
    const result = await processLearningChat(message, {
      uid: auth.uid,
      email: auth.email,
      role: auth.role,
      cohortId: cohortId || getActiveCohortId(),
      focusSessionId,
      pathname,
      history,
    });

    if (result.error) {
      return err(result.error, 502);
    }

    return ok({ text: result.text });
  } catch (e) {
    logServerRouteException("POST /api/learning-chat", e);
    return err("Learning chat failed", 500);
  }
}
