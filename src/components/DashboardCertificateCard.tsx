"use client";

import Link from "next/link";
import type { Session, UserProfile } from "@/types";
import {
  APRIL_2027_COHORT_ID,
  SEPTEMBER_2026_COHORT_ID,
  userInCohort,
} from "@/lib/cohorts";
import {
  attendedSessionIdsFromRecord,
  evaluateCertification,
} from "@/lib/certification";
import ShareButtons from "@/components/ShareButtons";
import { linkedinAddCertificationUrl } from "@/lib/linkedinShare";
import { publicSiteUrl } from "@/lib/siteUrl";
import { waitlistCopyForCohort } from "@/lib/joinCohortPolicy";

export default function DashboardCertificateCard(props: {
  profile: UserProfile;
  sessions: Session[];
  attendance: Record<string, unknown>;
}) {
  const { profile, sessions, attendance } = props;
  const septEnrolled = userInCohort(profile.cohortIds, SEPTEMBER_2026_COHORT_ID);
  const part = profile.cohortParticipation?.[SEPTEMBER_2026_COHORT_ID];
  const shareId = part?.certificateShareId;
  const certified = part?.status === "certified";
  const aprilOnly =
    userInCohort(profile.cohortIds, APRIL_2027_COHORT_ID) && !septEnrolled;

  if (aprilOnly) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-2">
        <h2 className="text-lg font-bold text-white">Next cohort</h2>
        <p className="text-amber-100/90">{waitlistCopyForCohort(APRIL_2027_COHORT_ID)}</p>
      </section>
    );
  }

  if (!septEnrolled) return null;

  const evalr = evaluateCertification({
    sessions: sessions.map((s) => ({
      id: s.id,
      cancelled:
        (Array.isArray(s.tags) && s.tags.some((t) => String(t).toLowerCase() === "cancelled")) ||
        /cancelled/i.test(s.title || ""),
      isClosing: s.isClosing === true,
    })),
    attended: attendedSessionIdsFromRecord(attendance),
  });

  if (certified && shareId) {
    const url = `${publicSiteUrl()}/certificate/${shareId}`;
    const issued = part?.certifiedAt ? new Date(part.certifiedAt) : new Date("2026-11-01");
    return (
      <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 space-y-3">
        <h2 className="text-lg font-bold text-white">Your certificate</h2>
        <p className="text-gray-300 text-sm">
          You are certified for AI DevCamp September 2026 (attended {evalr.attendedCount} of{" "}
          {evalr.countedSessionCount} counted sessions).
        </p>
        <ShareButtons
          url={url}
          text="I'm certified from AI DevCamp September 2026 🚀 #AIDevCamp #GDGLondon"
          linkedinAddUrl={linkedinAddCertificationUrl({
            name: "AI DevCamp September 2026",
            organizationName: "GDG London",
            issueYear: issued.getUTCFullYear(),
            issueMonth: issued.getUTCMonth() + 1,
            certUrl: url,
            certId: shareId,
          })}
        />
        <Link href={url} className="text-green-400 text-sm hover:underline">
          Open share page
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gray-900 p-6 space-y-2">
      <h2 className="text-lg font-bold text-white">Certification</h2>
      <p className="text-gray-300 text-sm">
        You attended {evalr.attendedCount} of {evalr.countedSessionCount} sessions; certification
        needed {evalr.required}.
      </p>
      <p className="text-gray-400 text-sm">{waitlistCopyForCohort(APRIL_2027_COHORT_ID)}</p>
    </section>
  );
}
