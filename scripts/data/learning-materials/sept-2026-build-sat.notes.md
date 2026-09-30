# Build — Workshop (26 September 2026)

Session recording: https://www.youtube.com/watch?v=7CcQwBGOHEY
CopilotKit: https://www.copilotkit.ai/
Lab site: https://sonikajanagill.com/ai-devcamp-labs/
Labs repo: https://github.com/sonikajanagill/ai-devcamp-labs
ADK docs: https://google.github.io/adk-docs/
ADK live (audio/video): https://adk.dev/live/

Speaker: Sonika Janagill (lead developer, MLOps / AI ops, Google Cloud; works at Satalia; Google Developer Expert in Cloud AI). Moderators: Sumith Damodaran and Renuka Kelkar (GDG London). Closed-group workshop. Recording and notes are for enrolled attendees.

Running use case: an agent that researches, drafts, and publishes a LinkedIn or X post, with a human always approving before the post goes out.

## Google Cloud setup (phase 1)

Create a new Google account if an existing free-tier Cloud account is out of credits. New accounts receive $300 of free credit (shown in local currency; about 90 days).

1. console.cloud.google.com — switch to the new account.
2. Create a project. Project names use hyphens, not underscores. The project ID is global; if the name is taken, Cloud appends a suffix. Matching the display name and ID reduces confusion.
3. Attach a billing account. A card is required even on the free tier. A dedicated billing account (for example "AI dev camp") is easier to recognise later.
4. Billing → Budgets & alerts. Set two alerts:
   - A normal budget alert (for example $10) that emails at 50%, 90%, and 100%. Scope it to the project. Vertex AI is the service that bills for model calls; other workshop services are on the free tier. You can alert on Vertex AI only, on all services, or both.
   - A spend-cap enforcement alert (for example $5 on Vertex AI). When the cap is hit, calls fail with a distinct error so you can raise the cap or stop. You can edit an existing cap instead of creating many alerts.
5. This workshop calls Vertex AI directly (Agent Development Kit), not the Gemini Developer API. Spend caps apply to the services that support them; Vertex AI is the one that matters here.

Some console steps cannot be scripted: creating auth tokens and some social-login setup. API enablement for this lab is done with gcloud in the next phase.

## Local tools (phase 2)

Install:

- Google Cloud SDK / gcloud CLI. If `gcloud` is already present, the install command is a no-op. `gcloud init` opens a browser to log in with the new Cloud account. If the copy-paste install command asks for a folder and lands inside the repo, use the official Cloud CLI install page instead.
- uv — package manager for the Python backend (fastest option used in the labs).
- Python (latest).
- Node — for the CopilotKit front end, used at the end of the workshop.

Then set the project and region. Copy the project ID from the console (Agent Platform / project picker, not the org-level billing page). Commands in the setup guide:

- Log in and set the quota project / application-default credentials. Application-default credentials expire (on the order of an hour); re-run login if calls start failing. If you use several Google accounts, set both user login and application-default login.
- Compute region: us-central1. Governance-phase features used later in the series are only in us-central1 today, and it is the cheapest region for this lab.
- Model location: global when you use a model alias such as Gemini Flash latest. An alias picks the newest version available. A pinned model version must use a regional endpoint (us-central1), not global.
- Enable the APIs listed in the setup guide with gcloud. If a Windows command fails on a slash, enable the failing service on its own line (`gcloud services enable ...`).

Checks: gcloud, uv, Python, and Node print versions, and gcloud prints the project you set.

Windows: most commands match macOS/Linux. Installers differ — use each tool's Windows instructions (uv documents them). WSL is smoother for some CLIs. ADK itself runs on Windows. Antigravity / Gemini CLI can be flaky on Windows; Cursor, VS Code, or another editor is fine. The IDE is not the agent you are building.

Repo: clone https://github.com/sonikajanagill/ai-devcamp-labs. For this Saturday, the tag is `pillar-build`. `starter` is an empty ADK agent. `main` is the latest if a tag will not check out. Fork or clone; submit a GitHub link the organisers can open.

Environment file (from the lab example): keep `try` / dry-run true while testing, location global, your project ID, and Vertex AI enabled (`vertexai` true; enterprise flag is optional, Vertex AI still works). Buddy check is optional and organised by the moderators.

## Coding agents and Agent Skills (phase 3)

You can build the ADK agent without a coding assistant, using `agent` CLI. Optional free helpers:

- Ollama with Gemma: local models, a monthly free budget (not a 5-hour window), no card required.
- Antigravity: free tokens on a personal Google account. When those run out, sign in with the Cloud project you created (project ID, region global) so Vertex AI usage stays inside the alerts you set. Switching personal vs Cloud requires a new chat session; history is shared because both use the same harness files. The Antigravity IDE and the CLI/plugin are the same harness — pick either. VS Code plus the plugin is what Sonika prefers.

Skills are markdown files with YAML metadata at the top (name, description, sometimes version and requirements). The agent keeps that metadata as a small graph. When your request matches a description, it loads the instructions (L2), then any referenced scripts or assets (L3). That is progressive disclosure: the context window stays short. Skill steps run as local commands, not as a full copy of your repo sent to the model, unless a step itself calls an external API.

ADK skills install under the user config (for example `.gemini/config` skills, and a project `.agents` folder). Read `adk-code` and related skills instead of only the docs. A skill can declare that it needs the agent CLI and install it if missing.

`agents.md` (sometimes shown as agents.mmd / Gemini MD in the generated tree) is the repo instruction file: what the project is, front end vs MCP vs skills folders, tech stack, folders not to touch, and how to run front end and back end on different ports. Update it for your own stack. It is personal and checked in only as a reference.

## Create and run an ADK agent

From the repo root, without a coding agent:

`agent CLI create` (the lab uses a project name such as a live-demo agent). One command scaffolds the tree: `app/` with the agent, Terraform deployment files (skip for this week), uv / pyproject dependencies, a readme, an agent markdown file, Docker, and an agent CLI manifest.

A minimal agent needs a name, a model, and instructions. Tools are optional. The generated dummy agent uses a Gemini 3.x model (3.8 in the demo) and two simulated tools: weather (always a fixed value) and current time from the machine.

Run it from inside that agent folder:

`agent CLI playground`

That starts ADK web on 127.0.0.1 with allowed origins (so a front end can call it) and reload (code changes apply without a restart). If several agents sit in the folder you launched from, the UI lists them. The default agent file is always `agent.md` inside a folder; change the folder name to get another agent, not the filename.

If you are already logged into gcloud, the playground picks up the project ID. Otherwise it asks you to log in.

Docs for everything in this section: https://google.github.io/adk-docs/ and https://adk.dev/live/ for streaming voice agents.

## Live audio and video

Change the model to a live (audio/video) model. Pinned live models do not run on the global endpoint — set the region to us-central1. Restart the playground if the new model does not load. The playground can take microphone input and speak back; interrupt the agent (bidirectional). Live models cost more. Test the agent in text first, then validate with a live model before you publish.

## Social-post agent architecture

Start with one agent, then add tools. The lab's social poster looks like this:

- Root agent (orchestrator). A cheaper Flash model is enough because it only routes. Put the model name in the env file and reference it from `agent.py`. Instructions: if you need facts you do not have, call research; otherwise skip it; then call the draft agent.
- Tools list on the root agent holds everything: other agents, skills, and MCP servers. You do not hard-code the call order. Describe the job in plain English and the model chooses. Explicit "if URL then use that image / if file uploaded then use that file" instructions are optional.
- Research agent: one tool, Google Search. Output key `research notes` (or the lab's output key) so the root agent reuses that text instead of rewriting it. Job: numbers and factual claims.
- Draft agent: another agent used as a tool. Turns research into the post.
- Memory agent (optional in the lab): skips work you already did.
- Generate-image tool: remove it from the tool list while testing if you want to avoid image-model cost. Generated images land in a local folder unless you configure a public Cloud Storage bucket (Cloud Build in the repo is only for that bucket; model calls are the only other Cloud usage this week).
- Callbacks (before/after agent, before/after tool) are optional and make behaviour more predictable. Not required.

Skills live outside the agent package so they can be reused. Load them with load-skill-from-directory and add them to the skill toolset. Four things on an agent: name, model, instructions, tools. The lab skills:

- Brand voice: casual, warm, no em-dashes (so it does not look machine-written). Metadata plus instructions. No version field required for your own ADK skills (Git is the version). Agent CLI skills do version because upstream updates can be unstable.
- Platform styles (L3 references): LinkedIn vs X character limits, hashtags.
- Post formatter: hook line, short paragraph, hashtags, no em-dashes. Without this, format drifts every run.
- Poster / brand style: left as an exercise — add one skill yourself (colours and references).

Scope decided in the workshop: research the web, generate an image, post to LinkedIn or X. Scaffolding and playground are this week. Evaluate and deploy are later sessions.

## Human confirmation before posting

Instructions alone ("ask me before you post") are not reliable. On the publish toolset set `require confirmation: true` (ADK tool confirmation). The tool then waits for an explicit yes. The same flag is on the Buffer post and on the LinkedIn post. The lab UI shows the approval gate, then the MCP post.

## Buffer MCP and LinkedIn MCP

MCP here is an API plus streaming. Connect with ADK's MCP toolset and streamable HTTP connect params. You need the server URL and a Buffer API key.

Buffer (https://buffer.com — create a key from the lab link; free accounts get one key). Put it in the env file. Buffer can post to LinkedIn, X, Instagram, TikTok, and other channels you connect. If the LinkedIn token / Buffer key is empty, dry-run stays on and nothing is published. Buffer's MCP has no dry-run, so the lab adds a 60-minute delay on Buffer posts; "publish now" sends immediately. The agent lists Buffer accounts, picks X or LinkedIn from your request, drafts, waits for approval, then creates the post. A public image URL (Cloud Storage) is required for Buffer to attach the generated image — that wiring is in the lab README; images still appear locally if you skip it. Homework: make the approval message clearer.

LinkedIn has no official MCP for posting. The repo includes a small custom MCP server (one file): each LinkedIn API call is a tool (`get profile` is required; `create post` is included). Instructions in the lab cover creating a LinkedIn app and token. LinkedIn is optional. A business page was used in the demo.

## Run the lab app (API + CopilotKit)

Two processes, order does not matter. From the repo root the lab scripts:

- Back end: `uv sync` if needed, then uvicorn. `main.py` wraps the same ADK agent as an OpenAI-compatible HTTP API (streaming and tools included). The front end does not use ADK web; it calls this API.
- Front end: `npm run dev` (Node / Next). First start is slow because of node_modules and Next cache; later starts are faster. Open http://localhost:3000.

CopilotKit (https://www.copilotkit.ai/) is the UI layer. It is the AG-UI integration listed for ADK (agent-to-UI): streaming responses instead of waiting for a full turn, and conversation memory passed between the front end and the back end in the same session. A raw API is stateless — you must resend context every call. CopilotKit is open source. The hosted pricing page has a free tier for one prototype / one developer; you can also use any other front end against the API `main.py` exposes. ADK quick start for CopilotKit is on their docs. Google ADK's own UI / AG-UI docs point at this integration. It is not required to be inside a paid Google product.

In the demo, a short X post ("Google live agents") used Gemini Flash latest (3.8 at the time of the session) via Vertex AI. Telemetry/logging is on (info level; switch to error to quiet it). Local memory is a SQLite-style DB (`db.py`) plus a gallery of generated images. Later (Scale) that memory moves to Agent Platform Memory Bank. The trace shows research arguments, draft, then account lookup, then the approval gate.

If only instructions are set and `require confirmation` is false, the agent posts immediately. With the flag, it drafts, asks, then posts.

## What "done" means this week

ADK web (or the CopilotKit UI) runs locally. That is the end of Build. Evals are generated when you use agent CLI, but how to evaluate is the next sessions. Scale (next week) covers Agent Runtime, logging/monitoring out of the box, and Cloud Run containers if you want to deploy the same agent on AWS or another cloud. This series itself targets Agent Platform so you do not have to containerise.

You can build agents without ADK: call the Gemini API / Interactions API directly, or use Firebase AI Logic if you already work in React or Flutter. ADK is the shortcut used here. Custom HTTP APIs deploy on Cloud Run; that is not this week's lab.

Discord: setup help and architecture questions. Keep submissions as a normal GitHub link organisers can open (Codespaces is fine if the link works). Do not rely on note-taker bots in the live meeting; use this recording.

## Commands and paths mentioned

- console.cloud.google.com — project, billing, budgets
- gcloud CLI login, project ID, region us-central1, services enable
- uv, Python, Node
- git clone labs repo; tag `pillar-build` or branch `main` / `starter`
- agent CLI setup (installs ADK skills), agent CLI create, agent CLI playground
- uv sync; uvicorn via the lab back-end script; npm run dev → localhost:3000
- env: project ID, location global (or us-central1 for pinned live models), Vertex AI true, Buffer API key, dry-run true until you mean to publish
