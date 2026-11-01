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

export type HalloweenRank = 1 | 2 | 3 | 4 | 5;

export function ordinalPlace(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
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
      return placement != null ? ordinalPlace(placement) : "Finalist";
  }
}

/** 1st–5th get the Halloween podium treatment; everyone else is a finalist card. */
export function halloweenRank(
  award: HackathonAward,
  placement: number | null
): HalloweenRank | null {
  if (award === "first-online" || award === "first-in-person") return 1;
  if (award === "second" || placement === 2) return 2;
  if (award === "third" || placement === 3) return 3;
  if (placement === 4) return 4;
  if (placement === 5) return 5;
  return null;
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
