---
name: learning-chat
description: >-
  AI DevCamp learning assistant (right-slider chat) with Gemini RAG over
  session materials — PDFs, transcripts, videos, concepts. Also covers the
  planned Learning MCP (BYO-LLM, auth, API key cycling). Use when adding
  materials, wiring LEARNING_GEMINI_API_KEY, tools/functions for session Q&A,
  seeding the corpus, changing /api/learning-chat, or designing MCP. Triggers
  on: "learning chat", "RAG", "session transcript", "learning Gemini", "PDF
  materials", "what was covered", "FloatingLearningChat", "learning MCP",
  "BYO LLM", "API key cycling".
---

# Learning chat (session RAG)

Inspired by Sitecore demo `AIChatPanel` (floating button + right drawer + Gemini tools), scoped to **programme learning** for signed-in attendees and admins.

**Full docs:** `docs/14-learning-assistant.md` (how it is built + MCP design).

## Architecture (shipped)

| Piece | Location |
|-------|----------|
| UI slider | `src/components/LearningChatPanel.tsx` (`FloatingLearningChat` in `layout.tsx`) |
| API | `POST /api/learning-chat` — `verifyAuth()` |
| Gemini (dedicated key) | `LEARNING_GEMINI_API_KEY` + optional `LEARNING_GEMINI_MODEL` |
| Chat + tools | `src/lib/learning-chat/chatService.ts`, `tools.ts` |
| Corpus | Firestore `sessionLearningMaterials/{id}` — **Admin SDK only** |
| Admin upsert | `PUT /api/admin/learning-materials` |
| Seed from sessions | `npm run seed-learning-materials` |

Flow: UI → Bearer token → `generateText` + tools → Admin SDK reads `sessions` + `sessionLearningMaterials` → grounded answer. Corpus is **not** dumped into the prompt whole; tools retrieve excerpts.

## Env (platform Gemini)

```bash
LEARNING_GEMINI_API_KEY=...          # required — separate from other products
LEARNING_GEMINI_MODEL=gemini-3.8-flash   # optional — latest GA Flash (Sep 2026)
# Future key pool (not implemented yet):
# LEARNING_GEMINI_API_KEYS=key1,key2,key3
```

Never put these keys in `NEXT_PUBLIC_*`.

## Tool functions (stable names — HTTP today, MCP later)

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
2. **Add a transcript / PDF extract** — `PUT /api/admin/learning-materials` with `kind: "transcript"` or `"pdf"` and full `textContent` (+ `url`).
3. **Change prompts / welcome** — `src/lib/learning-chat/constants.ts`.
4. **Deploy rules** after collection change:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Future: Learning MCP (BYO-LLM)

Not shipped. Design in `docs/14-learning-assistant.md`:

- MCP server exposes the **same tools**; **host LLM is the user’s** (Cursor / Claude / etc.).
- Auth: Firebase ID token or short-lived MCP session from `POST /api/learning-mcp/session`.
- **API key cycling** applies only to **platform-paid** Gemini (in-app chat), via a key pool + 429 failover — not to BYO-LLM.
- Reuse `materialsRepo` — do not fork corpus logic.
- Phases: extract shared tool executors → MCP package → Cursor config docs → optional embeddings / key pool.

## Do's / don'ts

- **Do** keep the corpus server-only; chat goes through `/api/learning-chat`.
- **Do** ground answers with tools — do not invent session coverage.
- **Do** keep tool names stable for a future MCP surface.
- **Do** log every chat call to `learning_chat_logs` (never skip logging on errors).
- **Don't** add tools that read `users`, `learningTasks`, `attendance`, assignments, or buddies.
- **Don't** reuse marketing/CMS Gemini keys; this feature uses `LEARNING_GEMINI_*`.
- **Don't** expose materials via client Firestore reads.
- **Don't** put emails, attendance, or check-in codes into materials text.
- **Don't** put platform API keys in attendee-facing MCP client configs.
