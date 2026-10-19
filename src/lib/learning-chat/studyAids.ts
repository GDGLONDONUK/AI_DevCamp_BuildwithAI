/**
 * NotebookLM-inspired study aids grounded in programme materials.
 * Used by DevCamp MCP (BYO-LLM) and optionally the in-app learning chat.
 * Cards/quizzes are extracted from corpus text — the host LLM can enrich them.
 */

import { SPRING_2026_COHORT_ID } from "@/lib/cohorts";
import {
  getSessionById,
  listMaterialsForSession,
  searchLearningMaterials,
} from "@/lib/learning-chat/materialsRepoCore";
import type { Session, SessionLearningMaterial } from "@/types";

export type StudyFlashcard = {
  id: string;
  front: string;
  back: string;
  sessionId: string;
  sourceMaterialId?: string;
  sourceTitle?: string;
  kind: "term" | "outcome" | "concept" | "date";
};

export type StudyQuizItem = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  sessionId: string;
  sourceMaterialId?: string;
  sourceTitle?: string;
};

export type LearningGuidePack = {
  mode: "learning_guide";
  sessionId: string | null;
  cohortId: string;
  tutorInstructions: string;
  openingQuestions: string[];
  probingPrompts: string[];
  sourceExcerpts: Array<{
    materialId: string;
    title: string;
    kind: string;
    excerpt: string;
  }>;
  hostLlmRecipe: string;
};

function excerptAround(text: string, needle: string, radius = 180): string {
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const idx = lower.indexOf(n);
  if (idx < 0) {
    return text.slice(0, Math.min(320, text.length)).trim();
  }
  const start = Math.max(0, idx - Math.floor(radius / 3));
  return text.slice(start, start + radius * 2).replace(/\s+/g, " ").trim();
}

function sentenceFor(text: string, term: string): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  const hit = parts.find((p) => p.toLowerCase().includes(term.toLowerCase()));
  if (hit) return hit.trim().slice(0, 400);
  return excerptAround(text, term, 160);
}

async function loadSessionMaterials(
  cohortId: string,
  sessionId: string
): Promise<{ session: Session; materials: SessionLearningMaterial[] } | { error: string }> {
  const session = await getSessionById(sessionId);
  if (!session) return { error: `Session not found: ${sessionId}` };
  const sessionCohort = session.cohortId || SPRING_2026_COHORT_ID;
  if (sessionCohort !== cohortId) {
    return { error: "Session is not in the caller's cohort." };
  }
  const materials = (await listMaterialsForSession(sessionId)).filter(
    (m) => m.cohortId === cohortId
  );
  return { session, materials };
}

function pickCorpusText(materials: SessionLearningMaterial[]): SessionLearningMaterial | null {
  const preferred = ["notes", "transcript", "session_summary", "concept", "pdf"] as const;
  for (const kind of preferred) {
    const m = materials.find((x) => x.kind === kind && x.textContent.trim().length > 40);
    if (m) return m;
  }
  return materials.find((m) => m.textContent.trim().length > 40) ?? null;
}

/** Deterministic flashcards from session outcomes + material concepts (NotebookLM-style recall). */
export async function buildFlashcards(opts: {
  cohortId: string;
  sessionId: string;
  topic?: string;
  limit?: number;
}): Promise<{ sessionId: string; count: number; flashcards: StudyFlashcard[]; hostLlmRecipe: string } | { error: string }> {
  const loaded = await loadSessionMaterials(opts.cohortId, opts.sessionId);
  if ("error" in loaded) return loaded;
  const { session, materials } = loaded;
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 24);
  const cards: StudyFlashcard[] = [];
  const corpus = pickCorpusText(materials);

  const outcomes = session.whatYouWillLearn || [];
  for (const outcome of outcomes) {
    if (cards.length >= limit) break;
    cards.push({
      id: `fc-outcome-${cards.length}`,
      front: outcome,
      back:
        (corpus ? sentenceFor(corpus.textContent, outcome.split(" ").slice(0, 3).join(" ")) : null) ||
        session.description.slice(0, 280) ||
        `Covered in ${session.title} (${session.date}).`,
      sessionId: session.id,
      sourceMaterialId: corpus?.id,
      sourceTitle: corpus?.title,
      kind: "outcome",
    });
  }

  const conceptSet = new Set<string>();
  for (const m of materials) {
    for (const c of m.concepts || []) {
      if (c.trim()) conceptSet.add(c.trim());
    }
  }
  if (session.topic) conceptSet.add(session.topic);
  for (const tag of session.tags || []) conceptSet.add(tag);

  let concepts = [...conceptSet];
  if (opts.topic?.trim()) {
    const t = opts.topic.toLowerCase();
    concepts = concepts.filter((c) => c.toLowerCase().includes(t));
    if (concepts.length === 0) concepts = [...conceptSet];
  }

  for (const term of concepts) {
    if (cards.length >= limit) break;
    const source =
      materials.find((m) => (m.concepts || []).some((c) => c === term)) || corpus;
    cards.push({
      id: `fc-term-${cards.length}`,
      front: term,
      back: source
        ? sentenceFor(source.textContent, term)
        : `${term} — key idea in ${session.title}.`,
      sessionId: session.id,
      sourceMaterialId: source?.id,
      sourceTitle: source?.title,
      kind: "term",
    });
  }

  if (session.date && cards.length < limit) {
    cards.push({
      id: `fc-date-0`,
      front: `When is / was "${session.title}"?`,
      back: `${session.date}${session.time ? ` · ${session.time}` : ""} (week ${session.week}).`,
      sessionId: session.id,
      kind: "date",
    });
  }

  return {
    sessionId: session.id,
    count: cards.length,
    flashcards: cards.slice(0, limit),
    hostLlmRecipe:
      "Present these flashcards one at a time. Ask the learner for the back before revealing. " +
      "If they ask to 'explain', expand using only the cited source materials (call search_session_materials). " +
      "Do not invent programme facts beyond the cards and tool results.",
  };
}

/** Multiple-choice quiz items grounded in session concepts / outcomes. */
export async function buildQuiz(opts: {
  cohortId: string;
  sessionId: string;
  limit?: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<{ sessionId: string; count: number; quiz: StudyQuizItem[]; hostLlmRecipe: string } | { error: string }> {
  const loaded = await loadSessionMaterials(opts.cohortId, opts.sessionId);
  if ("error" in loaded) return loaded;
  const { session, materials } = loaded;
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 12);
  const corpus = pickCorpusText(materials);

  const pool: string[] = [];
  for (const m of materials) {
    for (const c of m.concepts || []) if (c.trim()) pool.push(c.trim());
  }
  for (const o of session.whatYouWillLearn || []) pool.push(o);
  if (session.topic) pool.push(session.topic);
  const unique = [...new Set(pool)].filter((x) => x.length > 2);
  if (unique.length < 2) {
    return {
      error:
        "Not enough concepts in materials to build a quiz. Seed or upsert learning materials first.",
    };
  }

  const quiz: StudyQuizItem[] = [];
  const difficulty = opts.difficulty || "medium";

  for (let i = 0; i < unique.length && quiz.length < limit; i++) {
    const answer = unique[i];
    const distractors = unique.filter((u) => u !== answer).slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(`Related idea from ${session.topic || "this session"} (${distractors.length + 1})`);
    }
    const choices = [answer, ...distractors.slice(0, 3)];
    // Fisher–Yates light shuffle with stable seed from index
    for (let j = choices.length - 1; j > 0; j--) {
      const k = (i * 7 + j * 3) % (j + 1);
      [choices[j], choices[k]] = [choices[k], choices[j]];
    }
    const correctIndex = choices.indexOf(answer);
    const explanation = corpus
      ? sentenceFor(corpus.textContent, answer.split(/\s+/).slice(0, 2).join(" "))
      : `From ${session.title}: ${answer}`;

    quiz.push({
      id: `qz-${quiz.length}`,
      question:
        difficulty === "easy"
          ? `Which concept is part of "${session.title}"?`
          : difficulty === "hard"
            ? `Which of these best matches what you should learn from ${session.title}?`
            : `Which option is a core idea from this session?`,
      choices,
      correctIndex: correctIndex < 0 ? 0 : correctIndex,
      explanation,
      sessionId: session.id,
      sourceMaterialId: corpus?.id,
      sourceTitle: corpus?.title,
    });
  }

  return {
    sessionId: session.id,
    count: quiz.length,
    quiz,
    hostLlmRecipe:
      "Ask one question at a time. After the learner answers, reveal correctIndex and explanation. " +
      "On wrong answers, call search_session_materials for a short grounded reteach — do not invent facts.",
  };
}

/** Learning Guide pack: Socratic tutor mode grounded in materials (NotebookLM Learning Guide). */
export async function buildLearningGuide(opts: {
  cohortId: string;
  sessionId?: string;
  focusTopic?: string;
}): Promise<LearningGuidePack> {
  let excerpts: LearningGuidePack["sourceExcerpts"] = [];
  let sessionTitle = "the active cohort";

  if (opts.sessionId) {
    const loaded = await loadSessionMaterials(opts.cohortId, opts.sessionId);
    if (!("error" in loaded)) {
      sessionTitle = loaded.session.title;
      const corpus = pickCorpusText(loaded.materials);
      if (corpus) {
        excerpts.push({
          materialId: corpus.id,
          title: corpus.title,
          kind: corpus.kind,
          excerpt: corpus.textContent.slice(0, 900),
        });
      }
      for (const m of loaded.materials.slice(0, 3)) {
        if (excerpts.some((e) => e.materialId === m.id)) continue;
        excerpts.push({
          materialId: m.id,
          title: m.title,
          kind: m.kind,
          excerpt: m.textContent.slice(0, 400),
        });
      }
    }
  }

  if (excerpts.length === 0) {
    const hits = await searchLearningMaterials({
      cohortId: opts.cohortId,
      query: opts.focusTopic || "overview key concepts",
      sessionId: opts.sessionId,
      limit: 4,
    });
    excerpts = hits.map((h) => ({
      materialId: h.id,
      title: h.title,
      kind: h.kind,
      excerpt: h.excerpt,
    }));
  }

  const topic = opts.focusTopic?.trim() || sessionTitle;

  return {
    mode: "learning_guide",
    sessionId: opts.sessionId ?? null,
    cohortId: opts.cohortId,
    tutorInstructions:
      "You are a Learning Guide for AI DevCamp. Prefer questions over lectures. " +
      "Help the learner reason step-by-step. Only teach from tool results / sourceExcerpts. " +
      "If unsure, call search_session_materials. Never invent attendance, grades, or other users' data.",
    openingQuestions: [
      `What do you already know about ${topic}?`,
      `Which part of ${sessionTitle} feels unclear right now?`,
      "What are you trying to build or practise next?",
    ],
    probingPrompts: [
      "Can you explain that idea in your own words?",
      "What would break if we removed this step from the pipeline?",
      "How does this connect to a previous session (Build / Scale / Govern / Optimise)?",
      "What would you try in a small experiment this week?",
    ],
    sourceExcerpts: excerpts,
    hostLlmRecipe:
      "Stay in Learning Guide mode: ask one probing question, wait for the learner, then scaffold. " +
      "Offer a short check (flashcard or quiz item) only after they attempt an explanation. " +
      "Cite material titles when you teach. Use list_my_learning_tasks if they ask about homework gaps.",
  };
}
