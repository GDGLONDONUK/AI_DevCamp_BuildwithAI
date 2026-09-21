# 14 · Learning Assistant (how we build it)

In-lesson **Learning Assistant** for signed-in attendees and admins: a right-hand slider chat that answers from programme materials (sessions, summaries, PDFs, transcripts, videos, concepts).

Product framing: **Ask · Summarize · Translate** — clarify concepts, summarise a lesson, or get help in the language the learner prefers.

Agent skill: `.claude/skills/learning-chat/SKILL.md`.

---

## How the chatbot is built (current)

### Mental model

```
Learner (browser)
  └─ LearningChatPanel (FAB + right drawer)
       └─ POST /api/learning-chat  (+ Firebase ID token)
            ├─ verifyAuth()          ← who is this? (blocks opt-out / disabled)
            ├─ processLearningChat() ← Vercel AI SDK + Gemini tools
            │    ├─ list_cohort_sessions
            │    ├─ get_session_detail
            │    ├─ search_session_materials   ← RAG over corpus
            │    ├─ list_session_materials
            │    └─ get_focus_hint
            └─ Admin SDK → Firestore
                 ├─ sessions/{id}                      (public schedule metadata)
                 └─ sessionLearningMaterials/{id}      (server-only RAG corpus)
```

We **do not** send the whole corpus to the model on every turn. The model **calls tools**; tools retrieve the relevant session rows / material excerpts; Gemini then answers grounded in that context.

### Stack choices

| Concern | Choice | Why |
|---------|--------|-----|
| UI | Floating button + right slider (`LearningChatPanel`) | Same pattern as Sitecore demo CMS chat; fits “inside the course” without a separate page |
| Auth | Firebase Bearer on every chat POST | Same boundary as other `/api/me/*` routes; no anonymous LLM spend |
| LLM | Dedicated **`LEARNING_GEMINI_API_KEY`** via `@ai-sdk/google` | Isolate quota/billing from any other product keys |
| Orchestration | Vercel AI SDK `generateText` + `tools` + `stepCountIs` | Multi-step tool use without a custom agent loop |
| Corpus | Firestore `sessionLearningMaterials` (Admin SDK only) | Least privilege; PDFs/transcripts stay off public `sessions` docs |
| Retrieval today | Keyword score over `textContent` | Simple, no vector infra yet; **tool names stay stable** if we add embeddings later |

### Request path (one user message)

1. User opens the slider (only if signed in with a profile).
2. Client sends `{ message, history?, focusSessionId?, pathname?, cohortId? }` with `Authorization: Bearer <idToken>`.
3. Server validates with Zod, resolves active cohort, runs `processLearningChat`.
4. Gemini may call tools (up to ~8 steps). Each tool hits Firestore via Admin SDK.
5. Final assistant text returns in `{ ok: true, data: { text } }`.
6. UI appends the bubble; Copy / Clear / Close match the product mockups.

### Corpus lifecycle

1. **Seed from sessions:** `npm run seed-learning-materials` → `session_summary` (+ `concept` / `video` stubs) per session.
2. **Enrich:** organisers `PUT /api/admin/learning-materials` with transcript / PDF extract text + optional `url`.
3. **Chat:** `search_session_materials` ranks by query tokens against title + concepts + `textContent`.

Sessions schedule data stays on public `sessions/{id}`. Sensitive or bulky learning text lives only in the corpus collection.

### Where it lives

| Piece | Path |
|-------|------|
| Floating button + slider UI | `src/components/LearningChatPanel.tsx` (`layout.tsx`) |
| Chat API | `POST /api/learning-chat` — `verifyAuth()` |
| Admin materials API | `GET` / `PUT /api/admin/learning-materials` — `requireAdmin()` |
| Gemini config | `src/lib/learning-chat/geminiConfig.ts` |
| Chat + tools | `src/lib/learning-chat/chatService.ts`, `tools.ts` |
| Corpus repo | `src/lib/learning-chat/materialsRepo.ts` |
| Defaults / welcome / chips | `src/lib/learning-chat/constants.ts` |
| Types | `SessionLearningMaterial` in `src/types/index.ts` |

### Environment (platform Gemini)

```bash
LEARNING_GEMINI_API_KEY=...                 # required — dedicated key
# LEARNING_GEMINI_MODEL=gemini-2.5-flash    # optional
```

Never put this under `NEXT_PUBLIC_*`.

### Data model — `sessionLearningMaterials/{id}`

**Rules:** `allow read, write: if false` (Admin SDK only).

```ts
{
  id: string
  sessionId: string
  cohortId: string
  title: string
  kind: "session_summary" | "transcript" | "pdf" | "video" | "slides" | "concept" | "notes" | "resource"
  textContent: string   // RAG body
  url?: string
  concepts?: string[]
  week?: number
  sessionTitle?: string
  sessionTopic?: string
  updatedAt?: string
  updatedByUid?: string
}
```

### Tool functions (model)

| Tool | Purpose |
|------|---------|
| `list_cohort_sessions` | Schedule overview for active cohort |
| `get_session_detail` | Description, outcomes, resources, video |
| `search_session_materials` | RAG search over corpus |
| `list_session_materials` | All materials for one session |
| `get_focus_hint` | UI focus session / pathname |

### Privacy, scope & API logging

- **Allowed:** active-cohort sessions, programme materials, curriculum learning activities (what you’ll learn / build ideas), Ask / Summarize / Translate on that content.
- **Forbidden:** other users’ profiles or emails; personal learning tasks; attendance / check-in codes; buddies; other people’s assignments/projects; admin/role changes.
- Enforcement: no tools touch those collections; session tools are **cohort-scoped**; heuristic refuse + system prompt; client `cohortId` ignored (server uses `getActiveCohortId()`).
- **Every** `POST /api/learning-chat` writes **`learning_chat_logs`** (preview, tools, duration, ok/error) and `activity_events` with `type: "learning_chat"`.

---

## Future: Learning MCP (bring your own LLM)

Goal: expose the **same learning tools + corpus** over **MCP** so attendees can use Cursor, Claude Desktop, or custom agents with **their own LLM**, while DevCamp still authenticates them and protects materials.

This is **not shipped yet**. Design below is the intended shape so we do not couple the UI forever to a single Gemini key.

### Why MCP

| Without MCP | With Learning MCP |
|-------------|-------------------|
| Only our in-app Gemini | Any MCP-capable client + user’s preferred model |
| One platform API key | Platform keys optional; users bring keys / org keys |
| Tools only inside `/api/learning-chat` | Same tools as MCP tools / resources |

### Proposed architecture

```
External LLM client (Cursor / Claude / custom)
  └─ MCP client
       └─ DevCamp Learning MCP server (Node)
            ├─ Auth: Firebase ID token or short-lived MCP session token
            ├─ Optional: caller-supplied LLM is OUTSIDE MCP
            │     (MCP only provides tools/resources — the host runs the model)
            ├─ Tools (same as today):
            │     list_cohort_sessions, get_session_detail,
            │     search_session_materials, list_session_materials, …
            └─ Admin SDK → sessionLearningMaterials + sessions
```

Important MCP principle: **the MCP server provides tools and context; the host LLM is chosen by the user.** DevCamp does not need to proxy OpenAI/Anthropic for BYO-LLM. For the **in-app** slider we may still call Gemini ourselves.

### Authentication

1. **Primary:** Firebase ID token (same as web) — MCP handshake or first tool call includes `Authorization: Bearer <idToken>`.
2. **Optional session exchange:** `POST /api/learning-mcp/session` with Firebase token → opaque `mcpSessionId` with TTL (e.g. 1h), stored hashed server-side; MCP transports that are awkward with Bearer headers use the session id.
3. **Enforce:** `programOptOut` / `accountDisabled` / enrolled in active cohort (if we gate materials by enrolment).
4. **Never** put Firebase refresh tokens or Admin credentials in MCP client config that attendees can read.

### API key cycling (platform keys only)

When DevCamp **does** call a model on behalf of the user (in-app chat, or a hosted “proxy completion” mode):

| Mechanism | Behaviour |
|-----------|-----------|
| **Key pool** | Env `LEARNING_GEMINI_API_KEYS=key1,key2,key3` (comma-separated) or Secret Manager list |
| **Round-robin / least-recent** | Pick next key per request; track last-used + cooldown |
| **429 / quota** | Mark key cooling for N minutes; fail over to next; surface friendly error if all exhausted |
| **Per-user rate limit** | Cap chats/hour per `uid` so one user cannot burn the pool |
| **Audit** | Log `uid`, key-id (not the secret), model, token estimate, tool names — never log full prompts with PII if avoidable |

BYO-LLM via MCP **does not** consume DevCamp Gemini keys — the user’s host model does. Cycling applies to **platform-paid** completions only.

### Suggested MCP tool surface (stable names)

Keep names aligned with `src/lib/learning-chat/tools.ts` so one implementation backs both HTTP chat and MCP:

- `list_cohort_sessions`
- `get_session_detail`
- `search_session_materials`
- `list_session_materials`
- `get_focus_hint` (optional for IDE; pass `sessionId` explicitly instead)

Optional later resources:

- `learning://session/{sessionId}` — markdown summary
- `learning://material/{materialId}` — full text (authz-checked)

### Suggested package layout (when implementing)

```
packages/learning-mcp/          # or scripts/learning-mcp/
  src/server.ts                 # MCP stdio or HTTP transport
  src/auth.ts                   # verify Firebase / session token
  src/tools.ts                  # wrap materialsRepo + session reads
```

Reuse `src/lib/learning-chat/materialsRepo.ts` and Firestore Admin init — do not duplicate corpus logic.

### Security checklist (MCP)

- [ ] Tools only return materials for cohorts the caller may access
- [ ] No write tools for attendees (writes stay on `/api/admin/learning-materials`)
- [ ] Rate-limit per uid / session
- [ ] Rotate platform keys without client changes (server pool only)
- [ ] Document Cursor MCP config with **env var references**, never committed secrets

### Implementation phases

1. **Now (done):** In-app slider + `/api/learning-chat` + Gemini tools + Firestore corpus.
2. **Next:** Extract tool executors into a shared module used by HTTP and (future) MCP.
3. **Then:** MCP server package + Firebase auth handshake + docs for Cursor.
4. **Optional:** Platform key pool cycling for in-app Gemini; embeddings behind the same `search_session_materials` tool.

---

## Related

- Home marketing CMS (`siteContent/home`) is separate — [08](./08-site-deployment-and-admin.md).
- Security boundaries — [04](./04-auth-and-security.md), skill `.claude/skills/firebase-security/SKILL.md`.

Next → [docs/README.md](./README.md)
