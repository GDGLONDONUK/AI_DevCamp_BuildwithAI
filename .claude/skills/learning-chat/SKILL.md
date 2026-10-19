---
name: learning-chat
description: >-
  MAINTAINER skill only (Claude Code / Cursor agents editing this repo).
  Not for programme attendees. Attendees use https://aidevcamp.gdg.london
  (in-app Learning Assistant + /mcp + /faq). Use this skill when changing
  learning-chat APIs, RAG corpus, MCP package, or LEARNING_GEMINI_*.
  Triggers on: learning chat, RAG, sessionLearningMaterials, FloatingLearningChat,
  packages/devcamp-mcp, LEARNING_GEMINI.
---

# Learning chat & MCP — **repo maintainers**

> **Attendees / Claude / ChatGPT users do not use this folder.**  
> They learn via the live site: [aidevcamp.gdg.london](https://aidevcamp.gdg.london/) → in-app chat, [`/faq`](https://aidevcamp.gdg.london/faq), [`/mcp`](https://aidevcamp.gdg.london/mcp).  
> `.claude/skills/*` only guides AI coding agents while changing this codebase.

All **runtime** learning + MCP logic lives in application code (not here):

| Concern | Code |
|---------|------|
| In-app chat UI | `src/components/LearningChatPanel.tsx` |
| Chat API | `POST /api/learning-chat` |
| Tools + RAG | `src/lib/learning-chat/*` (`tools.ts`, `toolExecutors.ts`, `studyAids.ts`, `materialsRepoCore.ts`) |
| Access tiers | `src/lib/access/programmeAccess.ts` |
| MCP tokens | `src/lib/mcp/accessTokens.ts`, `src/app/api/mcp/*`, `src/app/mcp` |
| MCP server | `packages/devcamp-mcp` (`npm run mcp:devcamp` / `mcp:http`) |
| Attendee FAQ | `src/app/faq/page.tsx` → `/faq` |
| Design notes | `docs/14-learning-assistant.md` |

## Architecture (runtime)

```
Attendee browser / Claude / ChatGPT
  └─ https://aidevcamp.gdg.london  (or hosted MCP HTTP)
       ├─ POST /api/learning-chat     (platform Gemini)
       └─ MCP Bearer dcmcp_…          (BYO LLM → packages/devcamp-mcp)
            └─ Admin SDK → Firestore sessions + sessionLearningMaterials + learningTasks
```

Corpus: `sessionLearningMaterials` — Admin SDK only. Seed: `npm run seed-learning-materials`.

## Env (platform Gemini — in-app only)

```bash
LEARNING_GEMINI_API_KEY=...
# LEARNING_GEMINI_MODEL=gemini-3.8-flash
```

Never `NEXT_PUBLIC_*`. BYO-LLM MCP does **not** use this key.

## When editing this feature

1. Keep tool names stable across HTTP chat and MCP.
2. Honour public / attendee / admin tiers (`programmeAccess` + MCP `requireAttendee` / `requireAdmin`).
3. Do not put user/assignment/attendance tools on the **in-app** learning HTTP surface.
4. Attendee docs belong on `/faq` and `/mcp`, not in `.claude/skills`.

## Do's / don'ts (maintainers)

- **Do** ground answers with Firestore tools; do not invent session coverage.
- **Do** log `/api/learning-chat` to `learning_chat_logs`.
- **Don't** tell attendees to clone the repo or open `.claude/skills` to learn.
- **Don't** put platform API keys in attendee MCP configs.
