---
name: learning-chat
description: >-
  MAINTAINER skill only (Claude Code / Cursor agents editing this repo).
  Not for programme attendees. Attendees use https://aidevcamp.gdg.london
  (in-app Learning Assistant + /mcp + /faq). Use this skill when changing
  learning-chat APIs, RAG corpus, MCP package, harness limits, or LEARNING_GEMINI_*.
  Triggers on: learning chat, RAG, sessionLearningMaterials, FloatingLearningChat,
  packages/devcamp-mcp, LEARNING_GEMINI, harness, dryRun.
---

# Learning chat & MCP — **repo maintainers**

> **Attendees / Claude / ChatGPT users do not use this folder.**  
> They learn via the live site: [aidevcamp.gdg.london](https://aidevcamp.gdg.london/) → in-app chat, [`/faq`](https://aidevcamp.gdg.london/faq), [`/mcp`](https://aidevcamp.gdg.london/mcp).  
> `.claude/skills/*` only guides AI coding agents while changing this codebase.

## Kitchen sink (follow these principles in *our* code)

Concepts from Optimise week — **no third-party slide images in git**. Full map: `docs/15-agent-harnessing-optimisation.md`.

| Principle | How we apply it |
|-----------|-----------------|
| Not one giant agent | Chat tools ≠ MCP packs ≠ maintainer skills |
| Input control | Zod + scope refuse before Gemini; MCP token + tier gates |
| Config over prompts | `LEARNING_HARNESS` + env — not longer system prompts |
| Tools execute | `toolExecutors` / `studyAids` for RAG, cards, quiz |
| Dry-run | `dryRun: true` on `/api/learning-chat` |
| Measure | `learning_chat_logs` (tools, steps, tokens, duration) |
| Shrink context | History + excerpt caps in harness |
| Cohort agents | Prefer Google ADK (`examples/adk-harnessed-agent/`) |

```
Attendee browser / Claude / ChatGPT
  └─ https://aidevcamp.gdg.london
       ├─ POST /api/learning-chat     (platform Gemini + learning tools)
       └─ MCP Bearer dcmcp_…          (BYO LLM → packages/devcamp-mcp packs)
            └─ Admin SDK → sessions + sessionLearningMaterials + learningTasks
```

## Code map

| Concern | Code |
|---------|------|
| Harness limits / dry-run | `src/lib/learning-chat/harness.ts` |
| In-app chat UI | `src/components/LearningChatPanel.tsx` |
| Chat API | `POST /api/learning-chat` |
| Tools + RAG | `tools.ts`, `toolExecutors.ts`, `studyAids.ts`, `materialsRepoCore.ts` |
| Access tiers | `src/lib/access/programmeAccess.ts` |
| MCP tokens | `src/lib/mcp/accessTokens.ts`, `src/app/api/mcp/*`, `src/app/mcp` |
| MCP server | `packages/devcamp-mcp` (`npm run mcp:devcamp` / `mcp:http`) |
| Attendee FAQ | `src/app/faq/page.tsx` → `/faq` |
| Design notes | `docs/14-learning-assistant.md`, `docs/15-agent-harnessing-optimisation.md` |

Corpus: `sessionLearningMaterials` — Admin SDK only. Seed: `npm run seed-learning-materials`.

## Env (platform Gemini — in-app only)

```bash
LEARNING_GEMINI_API_KEY=...
# LEARNING_GEMINI_MODEL=gemini-3.8-flash
```

Never `NEXT_PUBLIC_*`. BYO-LLM MCP does **not** use this key.

## MCP attendee role probe (maintainers)

Asserts a normal enrolled attendee gets learning scope only and **cannot** pass admin gates (including forged admin scope on the token doc).

```bash
# .env.local — never commit these values
DEVCAMP_MCP_PROBE_EMAIL=your-throwaway-attendee@example.com
# DEVCAMP_MCP_PROBE_PASSWORD=optional-if-omitted-random

npx tsx --env-file=.env.local scripts/mcp-probe-attendee-access.ts
# or: npm run mcp:probe-attendee
# optional once: --keep-password  (prints password; do not paste into git/chat logs)
```

**Do not** hardcode probe emails, passwords, or MCP tokens in `scripts/`, docs, or skills. Use env/CLI only.

## When editing this feature

1. Prefer a **new tool** (or MCP pack registration) over bloating the system prompt.
2. Keep tool names stable across HTTP chat and MCP.
3. Honour public / attendee / admin tiers (`programmeAccess` + MCP `requireAttendee` / `requireAdmin`).
4. Do not put user/assignment/attendance tools on the **in-app** learning HTTP surface.
5. Attendee docs belong on `/faq` and `/mcp`, not in `.claude/skills`.
6. Do **not** commit workshop slide PNGs or other third-party training imagery.

## Do's / don'ts (maintainers)

- **Do** ground answers with Firestore tools; do not invent session coverage.
- **Do** keep Optimise / harness concepts in RAG notes + `docs/15` (text only).
- **Do** log `/api/learning-chat` to `learning_chat_logs`.
- **Do** keep MCP/API tiers aligned: attendees never get admin tools; probe via `DEVCAMP_MCP_PROBE_EMAIL` + `npm run mcp:probe-attendee`.
- **Don't** tell attendees to clone the repo or open `.claude/skills` to learn.
- **Don't** put platform API keys, probe emails/passwords, or `dcmcp_` tokens in source or committed docs.
- **Don't** bind MCP HTTP to `0.0.0.0` without a trusted reverse proxy + TLS.
