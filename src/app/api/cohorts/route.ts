/**
 * GET /api/cohorts
 *
 * Public API to fetch all cohorts (with optional status filter).
 * Used by /past-cohorts page and cohort selector.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { logServerRouteException } from "@/lib/server/appErrorLog";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status")?.trim() || null;

    const snapshot = await adminDb().collection("cohorts").get();

    let cohorts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        cohortId: doc.id,
        name: (data.name as string) || doc.id,
        displayName: (data.displayName as string) || (data.name as string) || doc.id,
        status: (data.status as string) || "active",
        startDate: toIso(data.startDate),
        endDate: toIso(data.endDate),
        numberOfSessions: Number(data.numberOfSessions) || 0,
        description: data.description as string | undefined,
        stats: data.stats as
          | {
              totalRegistered?: number;
              totalApproved?: number;
              totalCertified?: number;
            }
          | undefined,
        theme: data.theme as string | undefined,
      };
    });

    if (statusFilter) {
      cohorts = cohorts.filter((c) => c.status === statusFilter);
    }

    cohorts.sort((a, b) => {
      const ta = a.startDate ? Date.parse(a.startDate) : 0;
      const tb = b.startDate ? Date.parse(b.startDate) : 0;
      return tb - ta;
    });

    return NextResponse.json(
      {
        success: true,
        count: cohorts.length,
        cohorts,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    logServerRouteException("GET /api/cohorts", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cohorts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
