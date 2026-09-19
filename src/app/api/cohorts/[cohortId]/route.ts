/**
 * GET /api/cohorts/[cohortId]
 *
 * Fetch a specific cohort with its sessions (flat `sessions` filtered by cohortId)
 * and the global speakers roster.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  try {
    const { cohortId } = await params;

    if (!cohortId) {
      return NextResponse.json({ error: "Cohort ID is required" }, { status: 400 });
    }

    const db = adminDb();
    const cohortDoc = await db.collection("cohorts").doc(cohortId).get();

    if (!cohortDoc.exists) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    const cohortData = cohortDoc.data() || {};

    const sessionsSnapshot = await db.collection("sessions").orderBy("number", "asc").get();
    const sessions = sessionsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          cohortId: data.cohortId || SPRING_2026_COHORT_ID,
        };
      })
      .filter((s) => s.cohortId === cohortId);

    const speakersSnapshot = await db.collection("speakers").orderBy("sortOrder", "asc").get();
    const speakers = speakersSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));

    return NextResponse.json(
      {
        success: true,
        cohort: {
          cohortId,
          ...cohortData,
          startDate: cohortData.startDate?.toDate?.() || cohortData.startDate,
          endDate: cohortData.endDate?.toDate?.() || cohortData.endDate,
        },
        sessions,
        speakers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching cohort:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cohort data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
