/**
 * GET /api/me/certificate — per-cohort certified status + Credsverse ids for this cohort.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth, ok, err, isErrorResponse } from "@/lib/api-helpers";
import { logServerRouteException } from "@/lib/server/appErrorLog";
import { certifierCredentialViewUrl } from "@/lib/server/certifier";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (isErrorResponse(auth)) return auth;

  try {
    const snap = await adminDb().collection("users").doc(auth.uid).get();
    if (!snap.exists) return err("Profile not found", 404);
    const data = snap.data()!;
    const cohortId =
      request.nextUrl.searchParams.get("cohortId")?.trim() || SEPTEMBER_2026_COHORT_ID;
    const part = (data.cohortParticipation || {})[cohortId] as
      | { status?: string; certificateShareId?: string; certifiedAt?: string }
      | undefined;

    if (part?.status !== "certified") {
      return err("Certificates are available for certified attendees only", 403);
    }

    const creds = (data.certifierCredentials || {})[cohortId] as
      | { credentialId?: string; publicId?: string; status?: string }
      | undefined;
    const publicId = creds?.publicId;
    const credentialId = creds?.credentialId;
    const shareId = part.certificateShareId;

    if (!publicId || !credentialId) {
      return ok({
        hasCertificate: false,
        shareId: shareId || null,
        sharePath: shareId ? `/certificate/${shareId}` : null,
        message:
          "Your DevCamp certificate page is ready. The Credsverse credential will appear once organisers issue it.",
      });
    }

    return ok({
      hasCertificate: true,
      credentialId,
      publicId,
      status: creds?.status ?? "issued",
      viewUrl: certifierCredentialViewUrl(publicId),
      shareId: shareId || null,
      sharePath: shareId ? `/certificate/${shareId}` : null,
    });
  } catch (e) {
    logServerRouteException("GET /api/me/certificate", e);
    return err("Failed to load certificate", 500);
  }
}
