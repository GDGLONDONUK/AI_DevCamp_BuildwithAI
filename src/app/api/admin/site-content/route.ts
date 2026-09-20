/**
 * GET/PUT /api/admin/site-content — admin home marketing copy.
 */

import { NextRequest } from "next/server";
import { ok, err, requireAdmin, isErrorResponse } from "@/lib/api-helpers";
import {
  loadHomeSiteContent,
  saveHomeSiteContent,
} from "@/lib/server/siteContentCache";
import { DEFAULT_HOME_SITE_CONTENT } from "@/lib/siteContent";
import {
  homeSiteContentSchema,
  toHomeSiteContent,
} from "@/lib/siteContentSchema";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const content = await loadHomeSiteContent();
    return ok(content);
  } catch (e) {
    logServerRouteException("GET /api/admin/site-content", e);
    return err("Failed to load site content", 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (body?.action === "seed") {
      const saved = await saveHomeSiteContent(DEFAULT_HOME_SITE_CONTENT, auth.uid);
      return ok(saved);
    }

    const parsed = homeSiteContentSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message || "Invalid site content");
    }

    const saved = await saveHomeSiteContent(toHomeSiteContent(parsed.data), auth.uid);
    return ok(saved);
  } catch (e) {
    logServerRouteException("PUT /api/admin/site-content", e);
    return err("Failed to save site content", 500);
  }
}
