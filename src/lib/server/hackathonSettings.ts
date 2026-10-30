/**
 * Organiser-controlled hackathon window (Admin SDK only).
 * `hackathonSettings/main` is server-only in firestore.rules.
 */

import { adminDb } from "@/lib/firebase-admin";
import { hackathonSubmissionsOpen } from "@/lib/hackathon";

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
