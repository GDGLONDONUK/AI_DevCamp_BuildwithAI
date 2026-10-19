# Optimise — Workshop (17 October 2026)

Session recording: https://www.youtube.com/watch?v=xLBJ1k_kh5o
Agent Governance Lab: https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3
Google ADK docs: https://google.github.io/adk-docs/
ADK live: https://adk.dev/live/
Programme guide (concepts + how DevCamp Learning Chat / MCP / skills apply the same harness): docs/15-agent-harnessing-optimisation.md — concepts only; workshop slide images are not in the repo.

Speakers: Renuka Kelkar (optimisation + custom govern content); Sumith Damodaran (cohort extension / hackathon). Closed group.

## ADK-first (required stance for cohort agents)

Prefer **Google Agent Development Kit (ADK)** + Gemini / Vertex for every cohort agent whenever possible. Map harness concerns onto ADK building blocks:

| ADK piece | Role | Harness use |
|-----------|------|-------------|
| Agents | Reasoning | Small specialists; right-size model per agent |
| Tools | Functions / APIs | Deterministic work — not LLM guessing |
| Sessions | Conversation tracking | Scope context; avoid replaying full history every turn |
| State | Shared session info | Brand rules, platform config, `dry_run` flags |
| Memory | Longer-term context | Retrieve on demand; do not dump into every prompt |
| Artifacts | Files / outputs | Validate presence after tools run |
| Callbacks | Execution hooks | before/after model & tool: validate, count tokens, fail-closed |

Optimisation is easier when the architecture is **modular, observable, and controllable**.

## Hackathon and extension

Cohort extended. Full-day in-person Agentic Hackathon, pitching, certificates, and awards in London on **31 October**, roughly 9–5. Mentors/speakers; possible investors and prizes. Free for this cohort with a discount code (priced for others). Partial stream (~12–1 and ~4–5). Remote cohort members can still take part as organised. Finish agents and be pitch-ready by the 31st. Luma: https://luma.com/wz7509ty · Site: /hackathon. Further teaching: **Thursday 22 October 18:00–19:00** — Optimisation and Q&A with **Renuka Kelkar** (right-sized models, analytics, traces, evals + open Q&A). FAQ hour with Nishi and Sonika discussed for a Saturday.

## Custom govern content (Renuka)

Private learning site (customer-service refund agent example): Agent Identity, Model Armor, Registry, Policy, Gateway — with behind-the-scenes code. Do not share publicly until published. GitHub cleaned of personal ids before wider share. Terraform/code possible; GUI shown so beginners see mechanics. Mock/dummy data during demos to avoid Model Armor/API spend. Policies: content security, access, business rules — AI can draft policy text. Gateway ≈ border officer. Platform vs roll-your-own: Duncan — platform cost may beat prompt-token pollution; Max — product testing cost if every hit goes to Model Armor; on-device (e.g. newer Macs) for some checks.

## What is an agent harness?

Harness = everything *around* the agent (supervisor between user and agent/tools):

- **Before:** validate input (completeness, safety/policy, choose model, decide if task should run)
- **During:** track tokens, tool calls, retries
- **After:** validate output, generate reports

Without a harness you are **flying blind**. Building = features for demos; harnessing = controlled, measurable production use.

## Nine harness control areas

1. Input control — validate, completeness, safety, model choice, run-or-not
2. Prompt optimisation — small prompts; no repeated context; fixed rules → config/tools; stop conditions
3. Tool control — allow-list; validate args; failure behaviour
4. Execution control — step order, stages, timeouts, retries, fallbacks
5. Token & cost tracking — model calls, prompt/response tokens, tools, images, spend risk
6. Observability & tracing — log steps, tool order, errors, where workflow stopped
7. Validation — artifacts created? required files? usage reported?
8. Evaluation — expected path? retries? token budget? clear failures?
9. Reporting — status, outputs, tokens/cost, trace events, eval result

Example (social/video agent): User ask → Harness checks → Script agent → Image tool → Video tool (if ready) → Report + eval.

## Avoid: one giant agent

Cramming script → clips → captions → validate → export into **one** agent → huge prompts, large context, hard debugging, expensive execution. *The larger the agent becomes, the harder optimisation becomes.* Split into ADK orchestrator + specialists.

## Cost pain case

Video agent (script → scenes → clips → stitch), inspired by Sonika’s lab / Veo-style demos. Large prompts, repeated context, retries → about **£100 in one day** of free credits. Not sellable at that unit cost.

## Optimisation patterns (ADK-mapped)

### #1 — Don’t ask AI what your code already knows

Platform formats, aspect ratios, brand limits → **Agent Skills / config / tools**, not prompts. Zero tokens for owned facts; faster; consistent. *Use AI only when intelligence is required.*

### #2 — Let tools do the work

**AI decides. Tools execute.** File convert, video stitch, image resize, API calls → ADK tools / MCP tools, not LLM free-text. Lower cost, better reliability, faster, cleaner architecture.

### #3 — Dry-run mode

Plan → show execution path → **STOP** before expensive APIs / rendering / Veo. Skip video gen, paid APIs, heavy render. Verify prompts, workflows, logic, tool selection first. *ADK:* `dry_run` in **state**; tools no-op or mock; callbacks enforce stop.

### #4 — Measure everything

*You cannot optimise what you don’t measure.* Every run should report: tokens, execution time, retries, tool calls, failures. Watch expensive prompts/tools and retry frequency. ADK metrics / Agent Platform traces after runs. Renuka building a **pre-run cost estimator** (~15 days goal).

### #5 — Different models for different tasks

Not every task needs the most powerful model.

- **Cheap (Flash):** routing, classification, validation
- **Medium:** content creation
- **Powerful:** reasoning, planning

Pin from Model Garden; set per sub-agent in ADK.

### #6 — Reduce context size

Context is a hidden cost. Don’t resend brand, campaign, platform rules, previous outputs every turn. Keep reusable data in **state / memory / DB**; send only what is required.

### #7 — Structured outputs

Prefer JSON/schema over free text (e.g. `{ "hook", "script", "cta" }`). Easier parsing, fewer retries, predictable, less token waste. Gemini structured output / response schemas via ADK where supported.

Also: caching; turn off optional “thought” tokens in Agent Studio for speed; deterministic skill→tool flows (Sumith SEO example: sitemap skill + regex tool) beat open-ended branching.

## Cost formula

```
Cost ≈ Prompt tokens + Response tokens + Tool calls + Retries + Testing runs
```

Most teams only watch production; **testing runs** are often larger — use dry-runs and mocks.

Illustrative workshop comparison (different modes; not a universal guarantee): total tokens ~16k → ~492; model calls 10 → 1; tool calls 15 → 5. After optimisation: **faster, cheaper, easier to maintain** without reducing quality. *Optimisation isn’t doing less; it’s doing it smarter.*

## Future of agent engineering

Today: “How do I **build** an agent?” Soon: “How do I **optimise** an agent?” Pillars: Observability · Optimisation · Evaluation · Governance · Cost management.

## Checklist before 31 Oct hackathon

1. Scaffold with ADK (agent CLI / Agent Studio → local ADK).
2. Multi-agent split; Flash-tier for routing/validation.
3. Platform rules → Skills/tools, not prompts.
4. Deterministic steps → tools (MCP where appropriate).
5. `dry_run` in state before Vertex / image / video spend.
6. Callbacks for ingress/egress validation (pair with Model Armor / DLP from Govern).
7. Structured outputs + measure tokens/tools/retries every run.
8. Pitch with a short cost/trace story (“what the harness measures”).

## Next

Thursday 22 Oct: evals / right-size models / traces. 31 Oct: hackathon + mentors. Help each other on Discord; status email from Sumith.
