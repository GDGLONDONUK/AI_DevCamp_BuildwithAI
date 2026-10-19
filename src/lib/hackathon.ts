/**
 * September 2026 cohort closing — Agentic Hackathon (in person + online).
 * Luma is the ticket / RSVP surface; final work is submitted via /submit.
 */

export const HACKATHON_LUMA_URL = "https://luma.com/wz7509ty";

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
  schedule: [
    {
      time: "9:00 AM–12:00 PM",
      title: "Kick-off and building",
      detail: "Open the day, form teams or go solo, and start shipping your agent.",
    },
    {
      time: "12:00–2:00 PM",
      title: "Expert sessions",
      detail: "Talks and mentoring from the organising team and guests.",
    },
    {
      time: "2:00–4:00 PM",
      title: "Build and polish demos",
      detail: "Finish the agent, rehearse the show-and-tell, and prepare your pitch.",
    },
    {
      time: "4:00–5:00 PM",
      title: "Showcases, pitching, closing & award ceremony",
      detail:
        "Project show-and-tell and pitches, then the cohort closing with certificates and awards.",
    },
  ],
  /** Programme end — same day as this event (cohort Firestore endDate). */
  cohortEndDateIso: "2026-10-31",
} as const;
