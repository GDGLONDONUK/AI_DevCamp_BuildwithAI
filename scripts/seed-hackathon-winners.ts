/**
 * Seed placement / award / judge blurbs on hackathon projects.
 * Idempotent. Clears githubUrl values that look like secrets.
 *
 *   npx tsx --env-file=.env.local scripts/seed-hackathon-winners.ts
 */

import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import { DEVCAMP_HACKATHON_ID } from "../src/lib/hackathon";
import { placementLabel, type HackathonAward } from "../src/lib/hackathonWinnersData";
import { urlLooksLikeSecret } from "../src/lib/safeProjectUrl";

type WinnerSeed = {
  placement: number | null;
  award: HackathonAward;
  projectId: string | null;
  title: string;
  builders: string;
  prize: string;
  judgeBlurb: string;
  teamMembers?: string[];
};

const MANUAL_CV_AGENT_ID = "manual-marina-cv-agent";

/** Bootstrap list for Firestore — public winners page reads projects + settings after this. */
const WINNER_SEEDS: WinnerSeed[] = [
  {
    placement: 1,
    award: "first-online",
    projectId: "95FkKKGgSXba3VxI93PF",
    title: "Pixel Astro Agent",
    builders: "NaYan Rath",
    prize: "Amazon voucher",
    judgeBlurb:
      "Highest score of the day — a team of specialist agents running live inside a real Android app.",
  },
  {
    placement: 1,
    award: "first-in-person",
    projectId: "yBUCY18NTiuOJxFkNKOj",
    title: "Autonomous Finance Portfolio Agent",
    builders: "Nanjundan Chinnasamy",
    prize: "Headphones",
    judgeBlurb:
      "Strongest architecture — a full multi-agent finance platform built on Google ADK for Java.",
  },
  {
    placement: 2,
    award: "second",
    projectId: "xfukEnMYEPcB1wkPspGD",
    title: "Plan B",
    builders: "Furkan Boran",
    prize: "Gaming keyboard",
    judgeBlurb: "Solves a real travel problem with parallel agents and live TfL data.",
  },
  {
    placement: 3,
    award: "third",
    projectId: "IlrzHlPXr26OQ2BHpogo",
    title: "Breach Range",
    builders: "Princess Okafor",
    prize: "JBL speaker",
    judgeBlurb:
      "Creative security idea — agents find and fix cloud weaknesses, with a human approving every fix.",
  },
  {
    placement: 4,
    award: "finalist",
    projectId: "hXToaQ18FwAVUGO6d13c",
    title: "Allergy-guard",
    builders: "Jayashri",
    prize: "Power charger",
    judgeBlurb: "The room's favourite — scans food labels for hidden allergens.",
  },
  {
    placement: 5,
    award: "finalist",
    projectId: "aviei39Fi9xMB1DB3MnT",
    title: "Access Fixer Agent",
    builders: "Veer",
    prize: "Power charger",
    judgeBlurb:
      "Automatically fixes website accessibility failures, and code checks every fix the AI makes.",
  },
  {
    placement: 6,
    award: "finalist",
    projectId: "1kNIOlDefyoIceDqR5n2",
    title: "WordBloom",
    builders: "Soumyamol Jayakumar",
    prize: "Laptop stand",
    judgeBlurb: "A friendly learning companion that helps children with dyslexia learn to read.",
  },
  {
    placement: 7,
    award: "finalist",
    projectId: "Yuj5kAM7S8y05FmsZqVA",
    title: "Eduslop",
    builders: "Taylor Norton-Brown",
    prize: "Laptop stand",
    judgeBlurb: "A fun, creative way to turn lectures into engaging bite-sized visuals.",
  },
  {
    placement: 8,
    award: "finalist",
    projectId: "2opJeOquYmV6vCZqLR6E",
    title: "Ghost Hunter",
    builders: "Diya & Nabiha",
    prize: "Gemini bag / Gemma hot mug",
    judgeBlurb:
      "Agents that find forgotten accounts, unused licences and risky access for IT teams.",
  },
  {
    placement: 9,
    award: "finalist",
    projectId: "tSkXwgbkDaoL2lnfIwqE",
    title: "Goodroute",
    builders: "Elhadj Diallo",
    prize: "Google bag",
    judgeBlurb: "AI assistants that help pharmacies and drivers manage medication deliveries.",
  },
  {
    placement: 10,
    award: "finalist",
    projectId: "huW7AeXhV7vhwG5pHlx4",
    title: "Ads Duck",
    builders: "Faiza Khan",
    prize: "Google bag",
    judgeBlurb: "Beautiful UX and deep marketing knowledge for honest ad attribution.",
  },
  {
    placement: 11,
    award: "finalist",
    projectId: "MA8NQHs2fzkXBJgqSe62",
    title: "UA Vibe",
    builders: "Andrii Drok",
    prize: "Google bag",
    judgeBlurb: "An AI community hub connecting Ukrainians across the UK.",
  },
  {
    placement: 12,
    award: "finalist",
    projectId: "bcEIIeQ0jS0ucmq0PIUd",
    title: "Personal Tutor",
    builders: "Amir, Nael & team",
    prize: "Bottles",
    judgeBlurb: "A maths tutor whose agent learns the student while the student learns maths.",
    teamMembers: ["Amir", "Nael"],
  },
  {
    placement: 13,
    award: "finalist",
    projectId: "AECIWQUs7XqekWu2pllA",
    title: "Tennis Serve Coach",
    builders: "Maria Ho",
    prize: "Bottle",
    judgeBlurb: "Turns tennis serve data into personal coaching tips and drills.",
  },
  {
    placement: 14,
    award: "finalist",
    projectId: null,
    title: "CV agent",
    builders: "Marina Yemets",
    prize: "Cap",
    judgeBlurb: "A promising idea with a nice UX, still at an early stage.",
  },
  {
    placement: 15,
    award: "finalist",
    projectId: "MQJmJJC0UpHDB15Ttk9h",
    title: "Vigil",
    builders: "Berktan Solmaz",
    prize: "Cap",
    judgeBlurb: "An agent that reads server logs and writes short incident reports.",
  },
];

async function clearSecretGithubUrl(ref: DocumentReference, githubUrl: string) {
  if (!urlLooksLikeSecret(githubUrl)) return false;
  await ref.set(
    {
      githubUrl: "",
      githubUrlClearedReason: "secret-pattern",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

async function main() {
  const db = adminDb();

  const [byHack, byCohort] = await Promise.all([
    db.collection("projects").where("hackathonId", "==", DEVCAMP_HACKATHON_ID).get(),
    db.collection("projects").where("cohortId", "==", "cohort-september-2026").get(),
  ]);
  const seen = new Set<string>();
  let stripped = 0;
  for (const doc of [...byHack.docs, ...byCohort.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const githubUrl = String(doc.data()?.githubUrl || "");
    if (await clearSecretGithubUrl(doc.ref, githubUrl)) stripped += 1;
  }
  if (stripped) {
    console.warn(
      `Cleared githubUrl on ${stripped} project(s) that matched a secret pattern — ask owners to rotate those tokens.`
    );
  }

  const manual = WINNER_SEEDS.filter((s) => !s.projectId).map((s) => ({
    id: MANUAL_CV_AGENT_ID,
    title: s.title,
    builders: s.builders,
    teamMembers: s.teamMembers || [s.builders],
    placement: s.placement,
    placementLabel: placementLabel(s.award, s.placement),
    award: s.award,
    prize: s.prize,
    judgeBlurb: s.judgeBlurb,
  }));

  await db.collection("hackathonSettings").doc("main").set(
    {
      hackathonId: DEVCAMP_HACKATHON_ID,
      winnersAnnounced: true,
      manualEntries: manual,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  let updated = 0;
  for (const seed of WINNER_SEEDS) {
    if (!seed.projectId) continue;
    const ref = db.collection("projects").doc(seed.projectId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`Missing project ${seed.title}`);
      continue;
    }
    await ref.set(
      {
        placement: seed.placement,
        placementLabel: placementLabel(seed.award, seed.placement),
        award: seed.award,
        prize: seed.prize,
        judgeBlurb: seed.judgeBlurb,
        teamMembers: seed.teamMembers || [seed.builders],
        status: seed.award === "finalist" ? "shortlisted" : "winner",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    updated += 1;
  }
  console.log(`Seeded ${updated} projects + ${manual.length} manual entries.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
