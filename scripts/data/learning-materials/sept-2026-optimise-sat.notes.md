# Optimise — Workshop (17 October 2026)

Session recording: https://www.youtube.com/watch?v=xLBJ1k_kh5o
Agent Governance Lab: https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3

Speakers: Renuka Kelkar (optimisation + custom govern content); Sumith Damodaran (cohort extension / hackathon). Closed group.

## Hackathon and extension

Cohort extended. Full-day in-person hackathon, graduation, and pitching in London on **31 October**, roughly 9–5. Mentors/speakers; possible investors and prizes. Free for this cohort with a discount code (priced for others). Partial stream (~12–1 and ~4–5). Remote cohort members can still take part as organised. Finish agents and be pitch-ready by the 31st. Rules emailed after organisers align offline. Further teaching: **22 October** (Sonika-oriented lab: right-sized models, analytics, traces, evals). FAQ hour with Nishi and Sonika discussed for a Saturday.

## Custom govern content (Renuka)

Private learning site (customer-service refund agent example): Agent Identity, Model Armor, Registry, Policy, Gateway — with behind-the-scenes code. Do not share publicly until published. GitHub cleaned of personal ids before wider share. Terraform/code possible; GUI shown so beginners see mechanics. Mock/dummy data during demos to avoid Model Armor/API spend. Policies: content security, access, business rules — AI can draft policy text. Gateway ≈ border officer. Platform vs roll-your-own: Duncan — platform cost may beat prompt-token pollution; Max — product testing cost if every hit goes to Model Armor; on-device (e.g. newer Macs) for some checks.

## Build vs harness

Building = structure and features for demos. Harnessing = controlled production use: track tokens, tool calls, retries during run; validate outputs; analytics. Blind “hope it works” is not production.

## Cost pain case

Video agent (script → scenes → clips → stitch), inspired by Sonika’s lab / Veo-style demos. Large prompts, repeated context, retries → about **£100 in one day** of free credits. Not sellable at that unit cost.

## Optimisation patterns

- Avoid one giant agent; multi-agent + isolation so each sub-agent can use a cheaper model.
- Do not ask the LLM what you already know — platform formats, aspect ratios → **skills/tools**.
- Video stitch / image resize as tools/APIs, not LLM calls.
- Dry run: mock data or low-cost on-device models; toggle to production LLMs when logic is solid.
- Measure tokens, latency, tool calls, failures — ADK exposes metrics after runs; Renuka building a **pre-run cost estimator** (~15 days goal).
- Shrink context: memory, DB, brand rules outside the prompt.
- Structured outputs; caching; turn off optional “thought” tokens in Agent Studio for speed.
- Deterministic skill→tool flows (Sumith SEO example: sitemap skill + regex tool) beat open-ended branching.
- Example result: token use cut to ~492 after tool-based stitching and turning off thought tokens.

## Formula to keep in mind

Cost ≈ prompt tokens + response tokens + tool calls + retries + test runs.

## Next

Thursday 22 Oct: evals / right-size models / traces. 31 Oct: hackathon + mentors. Help each other on Discord; status email from Sumith.
