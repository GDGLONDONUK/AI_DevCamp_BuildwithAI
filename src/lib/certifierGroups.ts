/**
 * Certifier credential groups for September 2026.
 * Designs: participation 01krydv66cpd6j3w19zjkpkjaq · completion 01krvgxvxadheqbbe5v7208fpd
 */

export const CERTIFIER_GROUP_PARTICIPATION =
  process.env.CERTIFIER_GROUP_ID_PARTICIPATION?.trim() || "01krye1285ajh93pebhz8yh8tt";

export const CERTIFIER_GROUP_COMPLETION =
  process.env.CERTIFIER_GROUP_ID_COMPLETION?.trim() || "01krvh488zv181waadghgt4jr0";

export const CERTIFIER_DESIGN_PARTICIPATION = "01krydv66cpd6j3w19zjkpkjaq";
export const CERTIFIER_DESIGN_COMPLETION = "01krvgxvxadheqbbe5v7208fpd";

export type SeptemberCertKind = "participation" | "completion";

export function certifierGroupForKind(kind: SeptemberCertKind): string {
  return kind === "completion" ? CERTIFIER_GROUP_COMPLETION : CERTIFIER_GROUP_PARTICIPATION;
}
