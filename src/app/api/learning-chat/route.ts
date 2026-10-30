/**
 * POST /api/learning-chat — signed-in learning tool only (sessions / materials).
 * Harness: Zod input → attendee gate → optional dryRun → Gemini+tools → learning_chat_logs.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, isErrorResponse, ok, err } from "@/lib/api-helpers";
import { requireAttendeeForCohort } from "@/lib/access/programmeAccess";
import { processLearningChat } from "@/lib/learning-chat/chatService";
import { logLearningChatCall } from "@/lib/learning-chat/chatLog";
import { LEARNING_HARNESS } from "@/lib/learning-chat/harness";
import { resolveActiveCohortIdFromDb } from "@/lib/server/activeCohort";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { logActivityEvent } from "@/lib/server/activityLog";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(LEARNING_HARNESS.maxMessageChars),
  focusSessionId: z.string().trim().max(120).optional(),
  pathname: z.string().trim().max(200).optional(),
  /** Ignored for authz — server always uses active cohort. Kept for client compat. */
  cohortId: z.string().trim().max(80).optional(),
  /** Plan tool surface + limits without calling Gemini (Optimise dry-run pattern). */
  dryRun: z.boolean().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(LEARNING_HARNESS.maxHistoryContentChars),
      })
    )
    .max(LEARNING_HARNESS.maxHistoryTurns * 2)
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  const started = Date.now();
  const cohortId = await resolveActiveCohortIdFromDb();
  let messagePreview = "";
  let messageLength = 0;
  let historyTurns = 0;
  let focusSessionId: string | undefined;
  let pathname: string | undefined;
  let dryRun = false;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      await logLearningChatCall({
        userId: auth.uid,
        userEmail: auth.email,
        cohortId,
        messagePreview: "",
        messageLength: 0,
        historyTurns: 0,
        ok: false,
        error: "Invalid request",
        durationMs: Date.now() - started,
      }).catch(() => undefined);
      return err(parsed.error.issues[0]?.message || "Invalid request");
    }

    const {
      message,
      focusSessionId: focus,
      pathname: path,
      history,
      dryRun: dry,
    } = parsed.data;
    messagePreview = message;
    messageLength = message.length;
    historyTurns = history?.length ?? 0;
    focusSessionId = focus;
    pathname = path;
    dryRun = Boolean(dry);

    const gate = await requireAttendeeForCohort(auth.uid, auth.role, cohortId);
    if (!gate.ok) {
      await logLearningChatCall({
        userId: auth.uid,
        userEmail: auth.email,
        cohortId,
        messagePreview: message.slice(0, 200),
        messageLength,
        historyTurns,
        focusSessionId,
        pathname,
        dryRun,
        ok: false,
        error: gate.error,
        durationMs: Date.now() - started,
      }).catch(() => undefined);
      return err(gate.error, gate.status);
    }

    const result = await processLearningChat(
      message,
      {
        uid: auth.uid,
        role: gate.actor.role,
        cohortId: gate.cohortId,
        focusSessionId,
        pathname,
        history,
      },
      { dryRun }
    );

    const durationMs = Date.now() - started;

    await logLearningChatCall({
      userId: auth.uid,
      userEmail: auth.email,
      cohortId,
      focusSessionId,
      pathname,
      messagePreview,
      messageLength,
      historyTurns,
      ok: !result.error,
      refusedOutOfScope: result.refusedOutOfScope,
      error: result.error,
      assistantPreview: result.text,
      toolsUsed: result.toolsUsed,
      stepCount: result.stepCount,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      dryRun,
      durationMs,
    }).catch((e) => console.error("learning_chat_logs write failed", e));

    await logActivityEvent({
      userId: auth.uid,
      userEmail: auth.email,
      type: "learning_chat",
      sessionId: focusSessionId,
      meta: {
        ok: !result.error,
        refusedOutOfScope: Boolean(result.refusedOutOfScope),
        durationMs,
        toolsCount: result.toolsUsed?.length ?? 0,
        dryRun,
        stepCount: result.stepCount ?? 0,
      },
    }).catch(() => undefined);

    if (result.error) {
      return err(result.error, 502);
    }

    if (dryRun) {
      return ok({ dryRun: result.dryRunPlan, text: result.text ?? null });
    }

    return ok({ text: result.text });
  } catch (e) {
    logServerRouteException("POST /api/learning-chat", e);
    await logLearningChatCall({
      userId: auth.uid,
      userEmail: auth.email,
      cohortId,
      focusSessionId,
      pathname,
      messagePreview,
      messageLength,
      historyTurns,
      dryRun,
      ok: false,
      error: "Learning chat failed",
      durationMs: Date.now() - started,
    }).catch(() => undefined);
    return err("Learning chat failed", 500);
  }
}
