# 22 Oct Workshop · Optimisation and Q&A (22 October 2026)

Session recording: https://www.youtube.com/watch?v=I6v39T7HUN8
17 Oct Optimise workshop recording: https://www.youtube.com/watch?v=xLBJ1k_kh5o
Google ADK docs: https://google.github.io/adk-docs/
Vertex AI Evaluation: https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview
Google Stitch: https://stitch.withgoogle.com/
Hackathon Luma: https://luma.com/wz7509ty
Site: /hackathon · submit: /submit
Guide: docs/15-agent-harnessing-optimisation.md

Speakers: Renuka Kelkar (Optimise lab + Q&A), with a live Cursor/ADK walkthrough. Week 4 (Optimise pillar). Closed group. Continues the 17 October harnessing session.

## What happened

Hands-on pass through the Optimise code lab (golden evals, env config, ADK web, intentional failures), then open Q&A on certificate tasks, hackathon submissions, agent architecture, and generating a short walkthrough video.

## Agent testing and evals

- Start by giving the coding agent project context, then run the lab prompts one step at a time (catch-up / baseline → golden set → fail on purpose → simulated users).
- Golden cases = evals: expected outputs, trajectory / LLM-as-judge / rubrics. Run `evals.sh` (or the lab’s `eval` folder + `run.sh`) and inspect results in **ADK web**.
- **Medium-fast models** are a practical tradeoff for this lab: fewer tokens than the strongest models, still usable speed and quality. Stronger models cost more tokens.
- Placeholder strings in backend env files (for example `social_poster.env`) make golden cases fail. Put **real values**, not sample placeholders.
- Model Armor / governance labs: use region **`us-central1`** when the default region fails.
- After fixing env, the five golden cases passed (0 failed).
- Next: **break tests on purpose** (wrong brand draft, jailbreak / red-team, simulated user that should be refused). A fail here is success — guardrails and judge-score drops should fire.
- Tip: prove guardrails on a **small sample agent** first, then copy working blocks into the main app. Query the agent for *why* a case failed (for example DLP judgement) instead of only retrying.

## Token and IDE optimisation

- New lab step → **new chat** so the model does not rescan a huge thread (cheaper context).
- Agents should **evaluate or create data**. After data exists, route it with **deterministic** (non-AI) code and tools — do not spend tokens on a path that is the same every time.
- Keep IDE AI usage lean; agents are expensive. A useful personal ratio discussed: about **1:4** manual vs agent — write new architecture and novel ADK/A2A yourself; let agents repeat work you have already done several times.
- **Isolate agents in folders** (own `agent.py` after one `adk create`). Assign **Flash** (cheap) vs **Pro** (reasoning / fact-check) per agent. Orchestrator wires sub-agents; do not assume every specialist needs the same model.

## How to use the code lab vs your project

- Follow Sonica’s Social Spark-style lab **start to finish** for the certificate track (Build → Scale → Govern → Optimise). Portal assignments still count even if your hackathon app is different.
- Your own product: experiment with the four stages; skip non-core scale steps if needed, but **build something, add a reasonable guardrail, and apply some optimisation**.
- Do not paste the whole lab repo URL and ask an agent to generate everything — you will not know where it broke. Step by step is the learning path.
- Discord for blockers; 31 Oct in-person mentors (including Sonika) can look at laptops. Day is roughly **9:00–17:00**.

## Hackathon (31 October)

- **Same camp project can be the hackathon entry** (portal `/submit` + Luma).
- **Online:** 30–60 second video (max ~1 minute) showing the app flow and **what the agent does**. Optional code snippets or temporary GitHub access for judges; remove access after. Strong online entries may be shown on the venue screen; online attendees can also speak.
- **In person:** scheduled slot; prefer a **pre-recorded video** plus 1–2 minutes Q&A rather than a long live laptop demo (time). Pitch as if investors are in the room: why this agent, goal, how you built/optimised it.
- **Halloween theme** — themed UI (pumpkins, skeletons, coats) is encouraged.
- **Beginners welcome** — AI Studio is enough; you do not need Anti-Gravity/Cursor to take part.
- In-person Luma has been a low paid ticket; **online is free**. Organisers send a detailed email (submission rules, time slots). Register: https://luma.com/wz7509ty

## Walkthrough videos (demo recording)

Cursor can generate an HTML **session walkthrough** (screens / sneak-peek) for the 30–60s demo. Quality depends on the prompt.

Practical recipe discussed:

1. Define product theme + logo in **ChatGPT** or **Google Stitch** (https://stitch.withgoogle.com/).
2. Ask ChatGPT to turn that into a **Cursor prompt** (covers more bases than writing the prompt yourself).
3. In Cursor, generate the walkthrough, then record or export a short video of the main screens.

Organisers said they will share the exact walkthrough prompt and Optimise tutorial write-up when ready.

## Decisions (aligned in the room)

- Stage gates for *your* product are flexible; certificate still needs the lab/portal tasks.
- Online judging: 30s–1 min video ± snippets / temporary repo access.
- Camp final project may be reused for the hackathon.
- Presentations: pre-recorded video, not a long live coding demo.

## Next for attendees

- Watch this recording, then the 17 Oct Optimise workshop if you missed harnessing.
- Finish Build / Scale / Govern (and Optimise) tasks on the dashboard for the certificate.
- Record the 30–60s demo; submit on `/submit`; register on Luma.
- Questions: Discord. See you 31 October.
