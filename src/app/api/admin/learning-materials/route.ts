/**
 * GET/PUT /api/admin/learning-materials — manage RAG corpus for learning chat.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse, ok, err } from "@/lib/api-helpers";
import { getActiveCohortId } from "@/lib/cohorts";
import {
  listMaterialsForCohort,
  upsertLearningMaterial,
} from "@/lib/learning-chat/materialsRepo";
import { logServerRouteException } from "@/lib/server/appErrorLog";

const materialSchema = z.object({
  id: z.string().trim().max(160).optional(),
  sessionId: z.string().trim().min(1).max(120),
  cohortId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(300),
  kind: z.enum([
    "session_summary",
    "transcript",
    "pdf",
    "video",
    "slides",
    "concept",
    "notes",
    "resource",
  ]),
  textContent: z.string().trim().min(1).max(200_000),
  url: z.string().trim().max(2000).optional(),
  concepts: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
  week: z.number().int().min(0).max(12).optional(),
  sessionTitle: z.string().trim().max(300).optional(),
  sessionTopic: z.string().trim().max(200).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const cohortId =
      new URL(request.url).searchParams.get("cohortId")?.trim() || getActiveCohortId();
    const materials = await listMaterialsForCohort(cohortId);
    return ok({ cohortId, count: materials.length, materials });
  } catch (e) {
    logServerRouteException("GET /api/admin/learning-materials", e);
    return err("Failed to load learning materials", 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = materialSchema.safeParse(raw);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid material");
    }

    const data = parsed.data;
    if (data.url && data.url.length > 0) {
      try {
        // eslint-disable-next-line no-new
        new URL(data.url);
      } catch {
        return err("url must be a valid URL");
      }
    }
    const saved = await upsertLearningMaterial(
      {
        ...data,
        url: data.url && data.url.length > 0 ? data.url : undefined,
      },
      auth.uid
    );
    return ok(saved);
  } catch (e) {
    logServerRouteException("PUT /api/admin/learning-materials", e);
    return err("Failed to save learning material", 500);
  }
}
