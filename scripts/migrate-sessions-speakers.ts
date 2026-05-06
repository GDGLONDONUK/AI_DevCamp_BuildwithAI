/**
 * Migrate embedded session speaker fields into `speakers/{id}` and `sessions.*.speakerIds`.
 *
 * Run from repo root with Firebase Admin env (same as API routes):
 *   npx tsx --env-file=.env.local scripts/migrate-sessions-speakers.ts
 *
 * Idempotent: skips sessions that already have non-empty `speakerIds`.
 */

import { adminDb } from "../src/lib/firebase-admin";

function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "speaker";
}

type LegacySpeaker = { name: string; title?: string; photo?: string };

function legacySpeakersFromSession(data: Record<string, unknown>): LegacySpeaker[] {
  const speakers = data.speakers as LegacySpeaker[] | undefined;
  if (Array.isArray(speakers)) {
    return speakers.filter((s) => (s?.name ?? "").trim().length > 0).map((s) => ({
      name: String(s.name).trim(),
      title: s.title?.trim() || undefined,
      photo: s.photo?.trim() || undefined,
    }));
  }
  const name = typeof data.speaker === "string" ? data.speaker.trim() : "";
  if (name) {
    return [
      {
        name,
        title:
          typeof data.speakerTitle === "string" ? data.speakerTitle.trim() || undefined : undefined,
        photo:
          typeof data.speakerPhoto === "string" ? data.speakerPhoto.trim() || undefined : undefined,
      },
    ];
  }
  return [];
}

async function main() {
  const db = adminDb();
  const sessionsSnap = await db.collection("sessions").get();
  const speakersCol = db.collection("speakers");

  let sessionsUpdated = 0;
  let speakersCreated = 0;

  for (const docSnap of sessionsSnap.docs) {
    const id = docSnap.id;
    const data = docSnap.data() as Record<string, unknown>;

    const existingIds = data.speakerIds as string[] | undefined;
    if (existingIds && existingIds.length > 0) {
      console.log(`[skip] ${id} already has speakerIds`);
      continue;
    }

    const legacy = legacySpeakersFromSession(data);
    if (legacy.length === 0) {
      await docSnap.ref.set({ speakerIds: [], updatedAt: new Date().toISOString() }, { merge: true });
      sessionsUpdated++;
      console.log(`[empty] ${id} → speakerIds: []`);
      continue;
    }

    const speakerIds: string[] = [];
    for (const row of legacy) {
      let sid = slugFromName(row.name);
      let attempt = sid;
      let n = 1;
      while ((await speakersCol.doc(attempt).get()).exists && n < 50) {
        n++;
        attempt = `${sid}-${n}`;
      }
      sid = attempt;

      const existing = await speakersCol.doc(sid).get();
      if (!existing.exists) {
        const sortSnap = await speakersCol.orderBy("sortOrder", "desc").limit(1).get();
        const maxOrder =
          sortSnap.empty ? 0 : (sortSnap.docs[0].data().sortOrder as number) || 0;
        await speakersCol.doc(sid).set({
          id: sid,
          name: row.name,
          title: row.title,
          photo: row.photo,
          sortOrder: maxOrder + 10,
          roles: ["speaker"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        speakersCreated++;
        console.log(`[speaker] created ${sid} (${row.name})`);
      }
      speakerIds.push(sid);
    }

    await docSnap.ref.set(
      {
        speakerIds,
        speakers: [],
        speaker: "",
        speakerTitle: "",
        speakerPhoto: "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    sessionsUpdated++;
    console.log(`[session] ${id} → speakerIds: ${JSON.stringify(speakerIds)}`);
  }

  console.log(
    JSON.stringify({ ok: true, sessionsUpdated, speakersCreated }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
