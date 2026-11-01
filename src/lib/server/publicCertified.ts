import { adminDb } from "@/lib/firebase-admin";
import { SEPTEMBER_2026_COHORT_ID } from "@/lib/cohorts";
import { publicGraduateName } from "@/lib/privacyDisplayName";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";
import { certifierCredentialViewUrl } from "@/lib/certifierLinks";
import { loadPublicWinners } from "@/lib/server/publicWinners";

export type PublicGraduate = {
  shareId: string;
  name: string;
  photoURL: string | null;
  profilePublic: boolean;
  projectPermalink: string | null;
  projectTitle: string | null;
  awardLabel: string | null;
};

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function loadSeptemberGraduates(): Promise<PublicGraduate[]> {
  const db = adminDb();
  const members = await db
    .collection("users")
    .where("cohortIds", "array-contains", SEPTEMBER_2026_COHORT_ID)
    .get();

  const { awarded } = await loadPublicWinners(DEVCAMP_HACKATHON_ID);
  const projectByUser = new Map<string, { permalink: string; title: string; awardLabel: string }>();
  for (const row of awarded) {
    const permalink = `/hackathon/${DEVCAMP_HACKATHON_ID}/p/${row.id}`;
    const awardLabel = row.award === "finalist" ? "Hackathon finalist" : row.placementLabel;
    const linked = { permalink, title: row.title, awardLabel };
    if (row.userId) projectByUser.set(row.userId, linked);
    projectByUser.set(nameKey(row.builders), linked);
  }

  const out: PublicGraduate[] = [];
  for (const doc of members.docs) {
    if (doc.id.includes("@")) continue;
    const data = doc.data();
    if (data.role === "admin" || data.role === "moderator") continue;
    const part = (data.cohortParticipation || {})[SEPTEMBER_2026_COHORT_ID] as
      | { status?: string; certificateShareId?: string }
      | undefined;
    if (part?.status !== "certified") continue;
    const displayName = String(data.displayName || "");
    const profilePublic = data.profilePublic === true;
    const linked = projectByUser.get(doc.id) || projectByUser.get(nameKey(displayName));
    const shareId =
      typeof part.certificateShareId === "string" && part.certificateShareId
        ? part.certificateShareId
        : "";
    out.push({
      shareId,
      name: publicGraduateName({ displayName, profilePublic }),
      photoURL:
        profilePublic && typeof data.photoURL === "string" && data.photoURL.startsWith("https://")
          ? data.photoURL
          : null,
      profilePublic,
      projectPermalink: linked?.permalink ?? null,
      projectTitle: linked?.title ?? null,
      awardLabel: linked?.awardLabel ?? null,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function loadCertificateShare(shareId: string): Promise<{
  name: string;
  cohortId: string;
  certifiedAt: string | null;
  credsverseUrl: string | null;
  publicId: string | null;
} | null> {
  const snap = await adminDb().collection("certificateShares").doc(shareId).get();
  if (!snap.exists) return null;
  const meta = snap.data() || {};
  const uid = String(meta.uid || "");
  const cohortId = String(meta.cohortId || SEPTEMBER_2026_COHORT_ID);
  if (!uid) return null;
  const user = await adminDb().collection("users").doc(uid).get();
  if (!user.exists) return null;
  const data = user.data() || {};
  const part = (data.cohortParticipation || {})[cohortId] as
    | { status?: string; certifiedAt?: string }
    | undefined;
  if (part?.status !== "certified") return null;
  const creds = (data.certifierCredentials || {})[cohortId] as
    | { publicId?: string }
    | undefined;
  const publicId = creds?.publicId || null;
  return {
    name: publicGraduateName({
      displayName: String(data.displayName || ""),
      profilePublic: data.profilePublic === true,
    }),
    cohortId,
    certifiedAt: typeof part.certifiedAt === "string" ? part.certifiedAt : null,
    credsverseUrl: publicId ? certifierCredentialViewUrl(publicId) : null,
    publicId,
  };
}
