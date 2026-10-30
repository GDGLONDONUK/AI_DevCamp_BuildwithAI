/**
 * Organiser-controlled hackathon window (Admin SDK only).
 * `hackathonSettings/main` is server-only in firestore.rules.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID, hackathonSubmissionsOpen } from "@/lib/hackathon";
import { AdminOpError } from "@/lib/server/admin/errors";

export type HackathonSettings = {
  submissionsOpen: boolean;
  votingOpen: boolean;
  winnersAnnounced: boolean;
  votingMessage?: string;
};

export async function readHackathonSettings(): Promise<HackathonSettings> {
  const snap = await adminDb().collection("hackathonSettings").doc("main").get();
  const data = snap.data() || {};
  const dateOpen = hackathonSubmissionsOpen();
  const submissionsOpen =
    typeof data.submissionsOpen === "boolean" ? data.submissionsOpen : dateOpen;

  const winnersAnnounced = data.winnersAnnounced === true;
  let votingOpen = data.votingOpen === true && !winnersAnnounced;
  let votingMessage: string | undefined =
    typeof data.votingMessage === "string" ? data.votingMessage : undefined;

  const opens = data.votingOpensAt?.toDate?.() as Date | undefined;
  const closes = data.votingClosesAt?.toDate?.() as Date | undefined;
  const now = Date.now();
  if (opens && now < opens.getTime()) {
    votingOpen = false;
    votingMessage = `Voting opens ${opens.toLocaleString("en-GB")}.`;
  }
  if (closes && now > closes.getTime()) {
    votingOpen = false;
    votingMessage = "Voting has closed.";
  }

  return { submissionsOpen, votingOpen, winnersAnnounced, votingMessage };
}

export async function hackathonSubmissionsAllowed(): Promise<boolean> {
  const settings = await readHackathonSettings();
  return settings.submissionsOpen;
}

export type HackathonSettingsPatch = {
  submissionsOpen?: boolean;
  votingOpen?: boolean;
  votingMessage?: string;
  winnersAnnounced?: boolean;
};

export async function updateHackathonSettings(
  actorUid: string,
  patch: HackathonSettingsPatch
): Promise<HackathonSettings> {
  if (
    patch.submissionsOpen === undefined &&
    patch.votingOpen === undefined &&
    patch.votingMessage === undefined &&
    patch.winnersAnnounced === undefined
  ) {
    throw new AdminOpError("Pass submissionsOpen, votingOpen, votingMessage, and/or winnersAnnounced", 400);
  }

  const payload: Record<string, unknown> = {
    hackathonId: DEVCAMP_HACKATHON_ID,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
  };
  if (patch.submissionsOpen !== undefined) payload.submissionsOpen = patch.submissionsOpen;
  if (patch.votingOpen !== undefined) payload.votingOpen = patch.votingOpen;
  if (patch.votingMessage !== undefined) payload.votingMessage = patch.votingMessage;
  if (patch.winnersAnnounced !== undefined) payload.winnersAnnounced = patch.winnersAnnounced;

  await adminDb().collection("hackathonSettings").doc("main").set(payload, { merge: true });
  return readHackathonSettings();
}
