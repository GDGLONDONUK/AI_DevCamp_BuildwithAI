---
name: learning-chat
description: >-
  AI DevCamp learning assistant (right-slider chat) with Gemini RAG over
  session materials — PDFs, transcripts, videos, concepts. Use when adding
  materials, wiring LEARNING_GEMINI_API_KEY, tools/functions for session Q&A,
  seeding the corpus, or changing /api/learning-chat. Triggers on: "learning
  chat", "RAG", "session transcript", "learning Gemini", "PDF materials",
  "what was covered", "FloatingLearningChat".
---

# Learning chat (session RAG)

Inspired by Sitecore demo `AIChatPanel` (floating button + right drawer + Gemini tools), scoped to **programme learning** for signed-in attendees and admins.

## Architecture

| Piece | Location |
|-------|----------|
| UI slider | `src/components/LearningChatPanel.tsx` (`FloatingLearningChat` in `layout.tsx`) |
| API | `POST /api/learning-chat` — `verifyAuth()` |
| Gemini (dedicated key) | `LEARNING_GEMINI_API_KEY` + optional `LEARNING_GEMINI_MODEL` |
| Chat + tools | `src/lib/learning-chat/chatService.ts`, `tools.ts` |
| Corpus | Firestore `sessionLearningMaterials/{id}` — **Admin SDK only** |
| Admin upsert | `PUT /api/admin/learning-materials` |
| Seed from sessions | `npm run seed-learning-materials` |

## Env (new Gemini instance)

```bash
LEARNING_GEMINI_API_KEY=...          # required — separate from other products
LEARNING_GEMINI_MODEL=gemini-2.5-flash   # optional
```

Never put this key in `NEXT_PUBLIC_*`.

## Tool functions (model)

- `list_cohort_sessions` — schedule overview
- `get_session_detail` — description, outcomes, resources, video
- `search_session_materials` — RAG keyword search over corpus
- `list_session_materials` — all materials for one session
- `get_focus_hint` — UI focus session / path

## Material kinds

`session_summary` | `transcript` | `pdf` | `video` | `slides` | `concept` | `notes` | `resource`

Each doc: `sessionId`, `cohortId`, `title`, `kind`, `textContent` (RAG body), optional `url`, `concepts[]`.

## Common tasks

1. **Seed summaries/concepts from live sessions**
   ```bash
   npm run seed-learning-materials
   npm run seed-learning-materials -- --cohort=cohort-june-2026
   ```
2. **Add a transcript / PDF extract** — `PUT /api/admin/learning-materials` with `kind: "transcript"` or `"pdf"` and full `textContent` (+ `url` to the file).
3. **Change prompts / welcome** — `src/lib/learning-chat/constants.ts`.
4. **Deploy rules** after collection change:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Do's / don'ts

- **Do** keep the corpus server-only; chat goes through `/api/learning-chat`.
- **Do** ground answers with tools — do not invent session coverage.
- **Don't** reuse marketing/CMS Gemini keys; this feature uses `LEARNING_GEMINI_*`.
- **Don't** expose materials via client Firestore reads.
- **Don't** put emails, attendance, or check-in codes into materials text.

## Extending (PDF / video pipeline)

1. Upload assets with Admin SDK to Storage (`learning-materials/…`, rules deny client write).
2. Extract text (PDF) offline or via a future admin job → store in `textContent`.
3. Store playable `url` on the material for citations.
4. Optionally replace keyword `searchLearningMaterials` with embeddings later; keep the same tool names.
