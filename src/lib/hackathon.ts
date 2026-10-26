/**
 * September 2026 cohort closing — Agentic Hackathon (in person + online).
 * Luma is the ticket / RSVP surface; projects ship via /hackathon/my-projects
 * (DevCamp final project = hackathon entry). Content: prizes/rules in hackathonContent.ts.
 */

import { DEFAULT_HACKATHON_PRIZES } from "@/lib/hackathonContent";

export const HACKATHON_LUMA_URL = "https://luma.com/wz7509ty";

/** Firestore / vote edition id for this programme closing. */
export const DEVCAMP_HACKATHON_ID = "devcamp-september-2026";

export const HACKATHON_EVENT = {
  title: "AIDevCamp 2026 Agentic Hackathon | GDG London",
  shortTitle: "Agentic Hackathon",
  dateLabel: "Saturday, 31 October 2026",
  timeLabel: "9:00 AM–5:00 PM",
  venueName: "Encode Hub",
  venueAddress: "41 Pitfield St, London N1 6DA, UK",
  modeLabel: "In person (London) and online",
  lumaUrl: HACKATHON_LUMA_URL,
  sessionId: "sept-2026-hackathon",
  hackathonId: DEVCAMP_HACKATHON_ID,
  /** Idea drafts / gallery open (London). */
  ideaOpensIso: "2026-10-01T00:00:00+01:00",
  /** Final ship deadline (end of hackathon day). */
  submissionClosesIso: "2026-10-31T17:00:00+00:00",
  schedule: [
    {
      time: "9:00–11:00 AM",
      title: "Registration, kick-off and building",
      detail: "Open the day, form teams or go solo, and start shipping your agent.",
    },
    {
      time: "11:00 AM–1:00 PM",
      title: "Expert sessions",
      detail: "Sessions from mentors.",
    },
    {
      time: "1:00–3:00 PM",
      title: "Build and polish demos",
      detail: "Finish the agent, rehearse the show-and-tell, and prepare your pitch.",
    },
    {
      time: "3:00–5:00 PM",
      title: "Showcases, pitching, closing & award ceremony",
      detail:
        "Project show-and-tell and pitches, then the cohort closing with certificates and awards.",
    },
  ],
  /** Programme end — same day as this event (cohort Firestore endDate). */
  cohortEndDateIso: "2026-10-31",
} as const;

export { DEFAULT_HACKATHON_PRIZES };

export function hackathonIdeasOpen(now = Date.now()): boolean {
  return now >= Date.parse(HACKATHON_EVENT.ideaOpensIso);
}

export function hackathonSubmissionsOpen(now = Date.now()): boolean {
  const opens = Date.parse(HACKATHON_EVENT.ideaOpensIso);
  const closes = Date.parse(HACKATHON_EVENT.submissionClosesIso);
  return now >= opens && now <= closes;
}

export function hackathonSubmissionStatusMessage(now = Date.now()): string | null {
  if (now < Date.parse(HACKATHON_EVENT.ideaOpensIso)) {
    return "Idea submissions open 1 October 2026.";
  }
  if (now > Date.parse(HACKATHON_EVENT.submissionClosesIso)) {
    return "Submissions closed. The deadline was 31 October 2026 at 17:00 UK.";
  }
  return null;
}
