# Govern — Workshop (15 October 2026)

Session recording: https://www.youtube.com/watch?v=860gVUhsSuw
Agent Governance Lab: https://renuka-agent-governance-workshop.renuka911346.chatgpt.site/#lesson-3
Slides (Canva): https://canva.link/g56lm40w274w9ee

Speaker: Renuka Kelkar (Hello GDG London). This session replaced the cancelled 10 October Saturday Govern workshop. Closed group — do not share unfinished lab links outside the cohort until Renuka publishes them.

## Codelab feedback

Sonika’s govern / Social Spark codelab mirrors corporate practice (CLI, prompts). Beginners find copy-paste long and hard to see the code. Max: useful skeleton, but complex. Duncan: learning happens when you write your own agent. Renuka: will show a simpler custom agent step by step and live-code layers.

## Demo agent

Minimal blog writer without a fancy UI: root orchestrator + search sub-agent + image sub-agent. Used to teach governance before full Social Spark complexity.

## Model Armor (hands-on)

In Cloud Console → Model Armor / Govern. Create a template (id with letters/numbers/_/-). Region for guardrails: **us-central1** (not global). Filters: prompt injection / jailbreak (high or medium+); responsible AI (hate, dangerous, sexual, harassment) high. Redeploy the agent after attaching. Playground: off-topic or harmful prompts should be refused. Ingress vs egress templates (input guard and output guard). Multi-agent: attach armor per component (e.g. poster and coordinator). ADK plugin / after-model callbacks shown in code.

Alexander: will Model Armor log the user id of a hateful poster? Renuka to check logging config. Soumyamol: multi-agent — same ingress/egress split across agents.

## DLP

Data Loss Prevention: stop bank details, passport numbers, contacts from flowing through chat. Non-technical users paste PII into agents. Add DLP layer so sensitive input is not processed/leaked.

## Agent Identity and Registry

Registry is a library: inventory, MCP servers, storage, logging. **Identity first** — without Agent Identity the registry stays empty. Then you see runtime, framework, A2A protocol, location, skills.

## Policies and gateway

Human-in-the-loop for publish (e.g. Buffer). Access policy vs business policy. Demo: movie/kids post rejected because business policy allows only educational / classroom topics. Agent Gateway = border check-post for traffic; needs policies first.

## Submissions and projects

Sumith grades submissions carefully for certification. Prefer private demo video or screenshots on GitHub; disconnect public Cloud endpoints to avoid open spend. Project ideas from the room: WhatsApp → Maps delivery routing; student mark/effort optimiser; community agents; trip/event finders. Deadlines for final agents announced later; Saturday was for teaching, not final pitches.

## Optimisation teaser

Building is easy; optimisation is hard. Renuka’s video-generation experiment (Google I/O / Veo credits) produced about a £100 one-day bill — reason to cover harnessing on 17 October.
