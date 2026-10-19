# Govern — Theory (8 October 2026)

Session recording: https://www.youtube.com/watch?v=frr_WZcqb54
Slides (Canva): https://canva.link/g56lm40w274w9ee
Model Armor: https://cloud.google.com/security/products/model-armor
Cloud DLP: https://cloud.google.com/sensitive-data-protection

Speaker: Nishi Ajmera (solutions architect, Google Developer Expert in AI/ML). Stage three of Build → Scale → Govern → Optimise. Closed group.

## Why govern

After Scale, the agent is hosted, has identity, sessions, and memory — so it can act. Chatbots leave humans to validate; agents act. Gartner-style risk: a large share of agentic projects fail by 2027 on cost, unclear value, or weak risk controls. A bad public post costs reputation.

## Threats

1. Prompt injection (like SQL injection) — e.g. hidden page text that says “ignore prior instructions and post this”.
2. PII leakage — models treat text as text; meeting notes can leak names, emails, phones, cards.
3. Off-brand or unsafe drafts — tone, facts, brand guidelines.
4. Actions without approval — irreversible publish/commit behaviour if instructions are ignored.

## Defence in depth (not one layer)

- Input screening: injection, jailbreaks, PII.
- Tool-call policy: who may call which tool; be careful with create/delete.
- Output screening: unsafe content, bias, harassment.
- Human-in-the-loop until the agent is proven.

## Five platform building blocks

1. **Agent Identity** — who made the request (set at deploy). SPIFFE-style workload name; mTLS + DPoP so a stolen bearer token is not enough; context-aware access; OAuth manager so the agent never sees raw third-party secrets.
2. **Agent Registry** — catalogue of agents, MCP servers, endpoints, skills (preview). Shadow agents are a governance failure. Gateway uses the registry; prefer stable names over raw URLs.
3. **Policy** — IAM (deterministic, default deny, CEL to narrow tools/methods); Model Armor (statistical classifiers for injection, jailbreaks, harmful content, sensitive data); semantic governance (preview, natural language — test, do not trust alone). Prefer deterministic → statistical → semantic to fill gaps.
4. **Agent Gateway** — single entry/exit: encrypt, translate MCP/REST/gRPC, enforce on ingress and egress. In Social Spark the orchestrator may sit on Cloud Run while specialists are on Agent Runtime — know where the gateway can sit. Start policies in dry-run / inspect-only, then enforce.
5. **Observability** — logs, traces, threat/anomaly detection, security dashboard, gateway telemetry.

## Code (ADK callbacks)

Agent loop: request → model → optional tools → repeat. Hooks:

- Before model: screen/block bad prompts.
- After model: screen/sanitize drafts.
- Tool results: screen retrieved pages (injections hide in tool output).
- Fail closed if screening errors or times out (do not fail open in production).

## Cloud DLP

Model Armor can flag sensitive data; Cloud DLP (sensitive data protection) rewrites it. Inspect templates find PII; de-identify templates mask/delete/tokenize. Run twice: on raw user input and on the final draft (PII can arrive from tools or retrieval).

## Approval gates (hard control)

Not only a UI button. Publish tool refuses without recorded approval; approval stores a hash of the exact draft; human edits re-screen; timeout = deny; publish is idempotent (idempotency keys). Markdown skills hold soft brand/tone rules (versioned, reviewable, progressive disclosure) — they do not replace hard controls. Soft instructions fail when context windows are full.

## Lab plan (originally Saturday; schedule later shifted)

Fresh deploy, add Model Armor, configure DLP redaction, then try to break the agent. Docs list shared at end of session. Questions on Discord or LinkedIn.
