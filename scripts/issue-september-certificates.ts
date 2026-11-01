/**
 * Issue September 2026 Credsverse certificates.
 *
 * Completion  — shipped project, hackathon finalist/winner, or 7+/8 counted sessions
 * Participation — certified at 60% (5–6 of 8) without that extra activity
 *
 * Testers (Sumith = completion, Meet = participation) are always included.
 *
 *   npx tsx --env-file=.env.local scripts/issue-september-certificates.ts
 *   npx tsx --env-file=.env.local scripts/issue-september-certificates.ts --apply
 *   npx tsx --env-file=.env.local scripts/issue-september-certificates.ts --testers-only --apply
 */

import { adminDb } from "../src/lib/firebase-admin";
import { SEPTEMBER_2026_COHORT_ID } from "../src/lib/cohorts";
import { isHackathonAward } from "../src/lib/hackathonWinnersData";
import { previewCloseCohort } from "../src/lib/server/closeCohort";
import { issueCertifierCredential } from "../src/lib/server/admin/certifierOps";
import {
  CERTIFIER_GROUP_COMPLETION,
  CERTIFIER_GROUP_PARTICIPATION,
  type SeptemberCertKind,
} from "../src/lib/certifierGroups";

const TESTERS: { email: string; kind: SeptemberCertKind; label: string }[] = [
  { email: "sumithpd@gmail.com", kind: "completion", label: "Sumith" },
  { email: "meet.bhorania@gmail.com", kind: "participation", label: "Meet" },
];

function arg(flag: string): boolean {
  return process.argv.includes(flag);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function winnerUids(): Promise<Set<string>> {
  const db = adminDb();
  const [byHack, byCohort] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", "devcamp-september-2026").get(),
    db.collection("projects").where("cohortId", "==", SEPTEMBER_2026_COHORT_ID).get(),
  ]);
  const uids = new Set<string>();
  const seen = new Set<string>();
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    const data = d.data();
    if (!isHackathonAward(data.award)) continue;
    const uid = String(data.userId || "");
    if (uid) uids.add(uid);
  }
  return uids;
}

async function shippedProjectUids(): Promise<Set<string>> {
  const db = adminDb();
  const [byHack, byCohort] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", "devcamp-september-2026").get(),
    db.collection("projects").where("cohortId", "==", SEPTEMBER_2026_COHORT_ID).get(),
  ]);
  const uids = new Set<string>();
  for (const d of [...byHack.docs, ...byCohort.docs]) {
    const data = d.data();
    if (data.status === "draft") continue;
    const uid = String(data.userId || "");
    if (uid) uids.add(uid);
  }
  return uids;
}

async function main() {
  const apply = arg("--apply");
  const testersOnly = arg("--testers-only");
  const preview = await previewCloseCohort(SEPTEMBER_2026_COHORT_ID);
  const [winners, shipped] = await Promise.all([winnerUids(), shippedProjectUids()]);

  type Row = {
    uid: string;
    displayName: string;
    kind: SeptemberCertKind;
    attendedCount: number;
    reason: string;
  };
  const attendees: Row[] = [];

  for (const q of preview.qualifying) {
    const highAttendance = q.attendedCount >= 7;
    const isWinner = winners.has(q.uid);
    const hasProject = shipped.has(q.uid);
    const kind: SeptemberCertKind =
      isWinner || hasProject || highAttendance ? "completion" : "participation";
    const reason = isWinner
      ? "hackathon finalist/winner"
      : hasProject
        ? "shipped project"
        : highAttendance
          ? "7+ of 8 sessions"
          : "60% attendance";
    attendees.push({
      uid: q.uid,
      displayName: q.displayName || q.uid,
      kind,
      attendedCount: q.attendedCount,
      reason,
    });
  }

  console.log(
    `Groups: participation=${CERTIFIER_GROUP_PARTICIPATION} completion=${CERTIFIER_GROUP_COMPLETION}`
  );
  console.log(
    `Attendees: ${attendees.length} · completion ${attendees.filter((a) => a.kind === "completion").length} · participation ${attendees.filter((a) => a.kind === "participation").length}`
  );
  for (const a of attendees.sort((x, y) => x.kind.localeCompare(y.kind) || x.displayName.localeCompare(y.displayName))) {
    console.log(`  ${a.kind.padEnd(13)} ${String(a.attendedCount).padStart(1)}/8  ${a.displayName}  (${a.reason})`);
  }
  console.log("Testers: Sumith → completion, Meet → participation");

  if (!apply) {
    console.log("Dry run. Pass --apply to issue and email. --testers-only to only send Meet + Sumith.");
    return;
  }

  const jobs: {
    uidOrEmail: string;
    kind: SeptemberCertKind;
    label: string;
    markCertified: boolean;
  }[] = TESTERS.map((t) => ({
    uidOrEmail: t.email,
    kind: t.kind,
    label: t.label,
    markCertified: false,
  }));

  if (!testersOnly) {
    for (const a of attendees) {
      jobs.push({
        uidOrEmail: a.uid,
        kind: a.kind,
        label: a.displayName,
        markCertified: true,
      });
    }
  }

  let issued = 0;
  let already = 0;
  let failed = 0;
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    try {
      const result = await issueCertifierCredential({
        uidOrEmail: job.uidOrEmail,
        cohortId: SEPTEMBER_2026_COHORT_ID,
        kind: job.kind,
        groupId:
          job.kind === "completion"
            ? CERTIFIER_GROUP_COMPLETION
            : CERTIFIER_GROUP_PARTICIPATION,
        skipIfExists: true,
        markCertified: job.markCertified,
      });
      if (result.alreadyIssued) {
        already += 1;
        console.log(`already  ${job.kind}  ${job.label}`);
      } else {
        issued += 1;
        console.log(`issued   ${job.kind}  ${job.label}  ${result.credential.viewUrl}`);
      }
    } catch (e) {
      failed += 1;
      console.error(`failed   ${job.kind}  ${job.label}  ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 10 === 0) await sleep(1500);
    else await sleep(250);
  }
  console.log(`Done. issued=${issued} already=${already} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
