/**
 * GET /api/site-content — public home marketing copy (CDN + in-memory cache).
 */

import { NextResponse } from "next/server";
import { loadHomeSiteContent } from "@/lib/server/siteContentCache";
import { logServerRouteException } from "@/lib/server/appErrorLog";

export async function GET() {
  try {
    const content = await loadHomeSiteContent();
    return NextResponse.json(
      { ok: true, data: content },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    logServerRouteException("GET /api/site-content", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load site content" },
      { status: 500 }
    );
  }
}
