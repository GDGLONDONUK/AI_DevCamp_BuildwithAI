import { DEVCAMP_HACKATHON_ID } from "@/lib/hackathon";

export const HACKATHON_WINNERS_PATH = `/hackathon/${DEVCAMP_HACKATHON_ID}/winners`;

export type HackathonAward =
  | "first-online"
  | "first-in-person"
  | "second"
  | "third"
  | "peoples-choice"
  | "finalist";

const AWARDS: HackathonAward[] = [
  "first-online",
  "first-in-person",
  "second",
  "third",
  "peoples-choice",
  "finalist",
];

export function isHackathonAward(value: unknown): value is HackathonAward {
  return typeof value === "string" && AWARDS.includes(value as HackathonAward);
}

export function placementLabel(award: HackathonAward, placement: number | null): string {
  switch (award) {
    case "first-online":
      return "1st (online)";
    case "first-in-person":
      return "1st (in person)";
    case "second":
      return "2nd";
    case "third":
      return "3rd";
    case "peoples-choice":
      return "People's Choice";
    default:
      return placement != null ? `${placement}th` : "Finalist";
  }
}

export function awardSortKey(award: HackathonAward, placement: number | null): number {
  switch (award) {
    case "first-online":
      return 0;
    case "first-in-person":
      return 1;
    case "second":
      return 2;
    case "third":
      return 3;
    case "peoples-choice":
      return 4;
    default:
      return 10 + (placement ?? 99);
  }
}

export function shareTextForWinner(opts: {
  award: HackathonAward;
  placement: number | null;
  title: string;
}): string {
  const place = placementLabel(opts.award, opts.placement);
  return `I placed ${place} at the AI DevCamp 2026 Agentic Hackathon with ${opts.title} 🚀 #AIDevCamp #GDGLondon #GoogleADK`;
}
