/**
 * Single programme project model: `projects/{id}`.
 *
 * DevCamp final project and Agentic Hackathon entry are the **same document**
 * for a user in a cohort. Optional fields (`hackathonId`, `teamName`, …) tag
 * that doc for the closing event — next cohort can omit them and keep submitting
 * plain projects.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";

export type PublicProjectCard = {
  id: string;
  title: string;
  teamName: string;
  description: string;
  projectType: "solo" | "team";
  openToMembers: boolean;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshotUrls: string[];
  userName: string;
  /** Owner uid — used to ban self-votes; not an email. */
  userId: string;
  voteTotal: number;
  status: string;
  cohortId?: string;
  hackathonId?: string;
  weekCompleted?: number;
};

export function toPublicProjectCard(
  id: string,
  data: FirebaseFirestore.DocumentData
): PublicProjectCard {
  return {
    id,
    title: String(data.title || ""),
    teamName: String(data.teamName || data.title || ""),
    description: String(data.description || ""),
    projectType: data.projectType === "team" ? "team" : "solo",
    openToMembers: data.openToMembers === true,
    techStack: Array.isArray(data.techStack) ? data.techStack.map(String) : [],
    githubUrl: typeof data.githubUrl === "string" ? data.githubUrl : undefined,
    demoUrl: typeof data.demoUrl === "string" ? data.demoUrl : undefined,
    screenshotUrls: Array.isArray(data.screenshotUrls)
      ? data.screenshotUrls.map(String).slice(0, 5)
      : [],
    userName: String(data.userName || "Builder"),
    userId: String(data.userId || ""),
    voteTotal: Number(data.voteTotal) || 0,
    status: String(data.status || "draft"),
    cohortId: typeof data.cohortId === "string" ? data.cohortId : undefined,
    hackathonId: typeof data.hackathonId === "string" ? data.hackathonId : undefined,
    weekCompleted: Number(data.weekCompleted) || undefined,
  };
}

function sortNewest(
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): FirebaseFirestore.QueryDocumentSnapshot[] {
  return [...docs].sort((a, b) => {
    const ta =
      a.data().updatedAt?.toMillis?.() ??
      a.data().submittedAt?.toMillis?.() ??
      0;
    const tb =
      b.data().updatedAt?.toMillis?.() ??
      b.data().submittedAt?.toMillis?.() ??
      0;
    return tb - ta;
  });
}

/**
 * The one programme project for this user in the live cohort (hackathon or not).
 * Never reuse a past-cohort project — a new cohort gets a new document.
 */
export async function findUserCohortProject(
  uid: string,
  cohortId: string
): Promise<(FirebaseFirestore.DocumentData & { id: string }) | null> {
  const db = adminDb();
  const byUser = await db.collection("projects").where("userId", "==", uid).limit(30).get();
  if (byUser.empty) return null;

  const docs = byUser.docs;
  const byCohort = sortNewest(
    docs.filter((d) => d.data().cohortId === cohortId)
  );
  if (byCohort[0]) return { id: byCohort[0].id, ...byCohort[0].data() };

  const byHackathon = sortNewest(
    docs.filter((d) => {
      const data = d.data();
      if (data.hackathonId !== DEVCAMP_HACKATHON_ID) return false;
      const existingCohort = data.cohortId;
      return !existingCohort || existingCohort === cohortId;
    })
  );
  if (byHackathon[0]) return { id: byHackathon[0].id, ...byHackathon[0].data() };

  return null;
}

/** @deprecated alias — same as findUserCohortProject for current edition */
export async function findUserHackathonProject(uid: string, cohortId: string) {
  return findUserCohortProject(uid, cohortId);
}

export async function listPublicHackathonIdeas(
  cohortId: string,
  opts?: { openOnly?: boolean; submittedOnly?: boolean }
) {
  const db = adminDb();
  // Edition gallery: tagged for this hackathon OR submitted under the live cohort.
  const [byHack, byCohort] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", DEVCAMP_HACKATHON_ID).get(),
    db.collection("projects").where("cohortId", "==", cohortId).get(),
  ]);

  const map = new Map<string, PublicProjectCard>();
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    map.set(d.id, toPublicProjectCard(d.id, d.data()));
  }

  let rows = [...map.values()];

  if (opts?.submittedOnly) {
    // Ballot / showcase: shipped projects (drafts excluded from casting).
    rows = rows.filter(
      (p) =>
        p.status === "submitted" ||
        p.status === "shortlisted" ||
        p.status === "winner" ||
        p.status === "reviewed" ||
        p.status === "passed"
    );
  } else {
    rows = rows.filter(
      (p) =>
        p.status === "draft" ||
        p.status === "submitted" ||
        p.status === "shortlisted" ||
        p.status === "reviewed" ||
        p.status === "passed"
    );
  }
  if (opts?.openOnly) {
    rows = rows.filter((p) => p.openToMembers && p.projectType === "team");
  }

  rows.sort((a, b) => a.title.localeCompare(b.title));
  return rows;
}

export async function listVoteableProjects(cohortId: string) {
  return listPublicHackathonIdeas(cohortId, { submittedOnly: true });
}

export async function bumpProjectVoteTotal(
  projectId: string,
  delta: number
): Promise<void> {
  const ref = adminDb().collection("projects").doc(projectId);
  await ref.set(
    {
      voteTotal: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export type UpsertProgrammeProjectInput = {
  uid: string;
  userName: string;
  cohortId: string;
  /** Stamp closing-event tag; omit next cohort for plain submissions. */
  hackathonId?: string | null;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshotUrls?: string[];
  weekCompleted?: number;
  teamName?: string;
  projectType?: "solo" | "team";
  openToMembers?: boolean;
  /** draft | submitted */
  status: "draft" | "submitted";
  ship?: boolean;
};

/**
 * Create or update the single cohort project for this user.
 */
export async function upsertUserCohortProject(
  input: UpsertProgrammeProjectInput
): Promise<{ id: string; created: boolean; data: Record<string, unknown> }> {
  const db = adminDb();
  const existing = await findUserCohortProject(input.uid, input.cohortId);
  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    userId: input.uid,
    userName: input.userName,
    title: input.title,
    description: input.description,
    techStack: input.techStack,
    githubUrl: input.githubUrl || "",
    demoUrl: input.demoUrl || "",
    screenshotUrls: input.screenshotUrls || [],
    weekCompleted: input.weekCompleted ?? 4,
    cohortId: input.cohortId,
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.hackathonId) {
    payload.hackathonId = input.hackathonId;
  }
  if (input.teamName !== undefined) {
    payload.teamName = input.teamName || input.title;
  }
  if (input.projectType !== undefined) {
    payload.projectType = input.projectType;
  }
  if (input.openToMembers !== undefined) {
    payload.openToMembers =
      input.projectType === "team" ? Boolean(input.openToMembers) : false;
  }

  if (input.ship || input.status === "submitted") {
    payload.submittedAt = FieldValue.serverTimestamp();
    payload.submittedAtClient = nowIso;
  }

  if (existing?.id) {
    if (typeof existing.voteTotal !== "number") {
      payload.voteTotal = 0;
    }
    await db.collection("projects").doc(existing.id).set(payload, { merge: true });
    return {
      id: existing.id,
      created: false,
      data: { ...existing, ...payload },
    };
  }

  payload.voteTotal = 0;
  payload.createdAt = FieldValue.serverTimestamp();
  if (!payload.submittedAt) {
    payload.submittedAt = FieldValue.serverTimestamp();
  }
  const ref = await db.collection("projects").add(payload);
  return { id: ref.id, created: true, data: payload };
}
