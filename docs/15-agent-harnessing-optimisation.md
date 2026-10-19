# 15 · Agent harnessing (concepts) + DevCamp AI kitchen sink

Optimise-week **principles** for cohort agents **and** for how this repo’s own AI surfaces are built. Workshop slide images are **not** stored in git (third-party content). Concepts only.

Prefer **[Google ADK](https://google.github.io/adk-docs/)** + Gemini / Vertex for **attendee project agents**. This Next.js app’s Learning Assistant uses the **Vercel AI SDK + Gemini** with the same *harness ideas* (tools, limits, measure, dry-run) — not a second ADK runtime inside the site.

---

## Concepts (follow these)

| Idea | Meaning |
|------|---------|
| **Harness** | Supervisor around the agent: validate in → track during → validate/report out |
| **Not one giant agent** | Split specialists; large agents → huge prompts, hard debug, high cost |
| **Config / skills over prompts** | Known rules live in code, env, Firestore — don’t ask the model |
| **AI decides, tools execute** | Deterministic work in functions/APIs |
| **Dry-run** | Plan + tool surface before expensive model/API spend |
| **Measure** | Tokens/steps/tools/retries/duration every run |
| **Right-size models** | Flash for routing/validation; stronger only for hard reasoning |
| **Shrink context** | Send only what’s needed (excerpts, capped history) |
| **Structured outputs** | JSON / schemas for cards, quizzes, plans |

Cost ≈ prompt + response + tool calls + retries + testing runs.

Cohort project checklist: ADK multi-agent, Skills/tools for rules, `dry_run` in state, callbacks + Model Armor (Govern), structured outputs, pitch with a metrics story. Closing: [/hackathon](https://aidevcamp.gdg.london/hackathon).

---

## Kitchen sink: how *this* project’s AI is set up

Three different “agents” — do **not** merge them into one prompt or one tool list.

```
┌─ Attendee browser ─────────────────────────────────────────┐
│  Floating Learning Chat → POST /api/learning-chat          │
│    harness: Zod + scope refuse + history/tool caps         │
│    model: LEARNING_GEMINI_* (Flash-tier default)           │
│    tools: learning pack only (sessions + materials + study)│
│    measure: learning_chat_logs + activity_events           │
│    dryRun: body.dryRun → plan, no Gemini call              │
└────────────────────────────────────────────────────────────┘

┌─ Attendee BYO LLM (Claude / ChatGPT / Cursor) ─────────────┐
│  /mcp + /faq → Bearer dcmcp_* → packages/devcamp-mcp       │
│  Specialist packs (not one giant MCP agent):               │
│    public → learning → study → my-tasks → admin            │
│  Same toolExecutors / materialsRepoCore as HTTP chat       │
│  Host LLM is the user’s — DevCamp supplies tools only      │
└────────────────────────────────────────────────────────────┘

┌─ Maintainer coding agents (Cursor / Claude Code) ──────────┐
│  .claude/skills/*  — edit the *repo*, not teach attendees  │
│  learning-chat skill → APIs, corpus seed, MCP package      │
│  Attendees must never be pointed at .claude/skills         │
└────────────────────────────────────────────────────────────┘
```

### Mapping principles → code

| Principle | In-app Learning Chat | DevCamp MCP | Maintainer skills |
|-----------|----------------------|-------------|-------------------|
| Input control | Zod body; `isLikelyOutOfScopeLearningQuery` refuses before Gemini | Opaque token + `requireAttendee` / `requireAdmin` per pack | Skill frontmatter scopes when to load |
| Config over prompts | `LEARNING_HARNESS` + `LEARNING_GEMINI_*` env | Tier + cohort from token / Firestore | Cohort/env in skills + `docs/` |
| Tools execute | `toolExecutors` + `studyAids` (RAG search, cards, quiz) | Same executors; admin/tasks separate | Skills point at scripts (`seed-learning-materials`) |
| Not giant agent | Chat tool list ≠ admin tools | `registerPublic/Learning/Study/MyTask/Admin` | Separate skills (cohorts, firebase-security, learning-chat) |
| Dry-run | `POST /api/learning-chat` `{ dryRun: true }` | Host can list tools without calling paid APIs | Read skill before coding |
| Measure | `learning_chat_logs` (tools, steps, tokens, duration) | Host traces + server auth logs | Lint/build after changes |
| Shrink context | History cap; search returns **excerpts** only | Don’t dump full corpus in one tool | Skills stay short; deep detail in `docs/` |
| Structured | Flashcards / quiz JSON from `studyAids` | JSON tool results (`okResult`) | Checklists in SKILL.md |

### Key files

| Area | Path |
|------|------|
| Harness limits + dry-run plan | `src/lib/learning-chat/harness.ts` |
| Chat loop | `src/lib/learning-chat/chatService.ts` |
| Scope / system prompt | `src/lib/learning-chat/scope.ts` |
| HTTP tools | `src/lib/learning-chat/tools.ts` |
| Shared executors | `src/lib/learning-chat/toolExecutors.ts` |
| Study aids (deterministic) | `src/lib/learning-chat/studyAids.ts` |
| API + logging | `src/app/api/learning-chat/route.ts`, `chatLog.ts` |
| MCP server | `packages/devcamp-mcp` (`createServer.ts` registers packs) |
| Attendee docs | `/faq`, `/mcp` |
| Maintainer skill | `.claude/skills/learning-chat/SKILL.md` |
| ADK sample for **cohort projects** | `examples/adk-harnessed-agent/` |

### Do / don’t (product AI)

- **Do** add capability as a **tool** (or MCP pack), not a longer system prompt.
- **Do** keep schedule facts and materials in Firestore; model retrieves via tools.
- **Do** keep admin / personal tasks off the in-app chat tool surface.
- **Don’t** commit third-party workshop slide images into the repo.
- **Don’t** tell attendees to open `.claude/skills` to learn the curriculum.

---

## Related

- Learning Assistant + MCP design — [14](./14-learning-assistant.md)
- Optimise session notes (RAG) — `scripts/data/learning-materials/sept-2026-optimise-sat.notes.md`
- Seed corpus — `npm run seed-learning-materials`
