import { APRIL_2027_COHORT_ID, type CohortLifecycle } from "@/lib/cohorts";

export function isCohortClosedLifecycle(life: CohortLifecycle): boolean {
  return life === "closed";
}

export function pickEnrolmentCohortId(
  rows: { id: string; life: CohortLifecycle; isCurrent: boolean }[],
  fallback: string
): string {
  const currentOpen = rows.find((r) => r.isCurrent && r.life !== "closed");
  if (currentOpen) return currentOpen.id;
  const open = rows.filter((r) => r.life === "upcoming" || r.life === "live");
  const live = open.find((r) => r.life === "live");
  return live?.id || open[0]?.id || APRIL_2027_COHORT_ID || fallback;
}
