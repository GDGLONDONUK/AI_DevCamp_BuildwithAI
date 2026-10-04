# Scale — Workshop (3 October 2026)

Session recording: https://www.youtube.com/watch?v=0MEwAaKtxm0
Agent Platform: https://cloud.google.com/products/agent-builder
ADK docs: https://google.github.io/adk-docs/

Speaker: Sonika Janagill. Saturday hands-on lab. The scale lab was published overnight; follow it step by step. Questions during the week go on Discord. Next week has a different presenter; Sonika questions still go to Discord.

## What this lab is

Build in Agent Studio without writing the first draft yourself, then deploy that ADK project to Agent Runtime with the agent CLI. After it is up: call it as an API, keep sessions and traces, attach a Memory Bank, and optionally put a front end on Cloud Run.

Week 2 submission (Sumith and Sonika): two things, not one. A deployed agent, and the deployed social poster with a front end. Send a screenshot or a GitHub link on Discord. Duncan asked whether week 2 is an updated personal project plus the updated lab repo: yes, both.

An enterprise agent certification focused on ADK is expected in November. This course maps to that material, but the exam is not the submission.

Cath: another provider such as Ollama is fine for the platform you use to build. The course path itself deploys on Agent Runtime.

## Agent Studio

Prompt for a root agent plus sub-agents (the demo was a plant agent: identify the plant, a variety checker, and plant care). Name the agent with no spaces. Get code downloads the ADK project as a starting point. Deploy from Studio grants storage APIs and writes the agent into a runtime. The dashboard then shows runtime sessions: each user turn is an event.

Studio chat and the build-and-scale deploy are the same path: deploying from Studio puts the agent on the runtime. Studio is text-only. Image, audio, and video agents are not in Studio. Use local ADK web, and the live-model branch, for audio and video. Ian hit this with Gemini Flash 3.5: "Direct image upload analysis isn't supported because the agent uses a text-only model."

Max: using Agent Studio alone is harder to iterate. Copy the code locally and work in Antigravity or your editor. That is the simpler loop. Redeploying from the repo updates the deployment when the manifest name matches. Copying Studio code into a new folder can also create a second deployment, which you then own from the repo. ADK in a repository is less constrained than the Studio UI.

Non-Google models: the runtime also runs other frameworks (LangChain, LlamaIndex, LangGraph). The lab path is ADK on Vertex. Java is supported on Agent Runtime; watch the same manifest and directory rules as Python.

## Deploy with the CLI

Prerequisites differ by agent. A tiny demo needs little. The social poster needs: gcloud login, quota project, env file, application-default credentials, a storage bucket, Vertex model access, a frontend service account, and API keys in Secret Manager. YOUR_PROJECT in the lab means your project id.

Create a scaffold from the project root:

`agents-cli create live-agent --adk`

or `agents-cli create demo-agent --adk` (double hyphens). Accept the upgrade prompts. Inspect the generated files and the default instructions.

Deploy from the directory that contains `agents-cli-manifest.yaml` (or a parent of that file):

`agents-cli deploy --project YOUR_PROJECT_ID --agent-identity`

Ankur's error "No agents-cli-manifest.yaml found in the current directory or its parents" means the command ran in the wrong folder. `cd` into the agent project (the demo agent folder, not an unrelated git root) and run it again. Pass the project id. `--agent-identity` creates a cryptographic principal for that agent instead of a normal shared service account. You can see it in IAM.

The manifest holds the agent name, local path, Docker build folder, and region. Deploy targets include Agent Runtime, GKE, and Cloud Run. The command creates the identity, then streams logs. Deploy can take a few minutes. "Status" can say nothing is pending even after success. Use the list command to confirm the agent is there. Ankur confirmed the demo agent showed up on Agent Platform after fixing the folder.

Tear down when you are done: delete Cloud Run services and agents you are not using. Agent Runtime is on a free tier through the end of 2026. Sonika will add tear-down steps to the lab docs. You can raise Cloud Run memory above the default. A minimum of one instance keeps the front end warm.

## RAG versus Vector Search

Follow-up from Scale theory: Vector Search syncs when the source data changes. A RAG corpus does not. If you add files or folders, re-sync yourself or do it in code. Duncan's rowing-club agent (13-week plan plus intervals.icu, losing context and slipping back to earlier weeks) is the kind of problem sessions and Memory Bank are for. Submit a sanitised dataset, not real member data.

## Gemini Enterprise

Ian asked about Gemini Enterprise. If the organisation already uses Gemini chat, you can register the deployed agent there and people use it inside that chat. You do not have to ship a custom UI for that path.

## API, curl, and Postman

The runtime publishes an OpenAPI description. From the folder that has the manifest, curl needs the engine name, project number, a token, and the engine id. The identity URL is in the agent settings. A successful call returns the OpenAPI document and shows the agent is there. Postman works the same way: bearer token, not a hard-coded key.

`main.py` outside the agent package wraps the agent as FastAPI routes, including agent-engine streaming. Nanjundan: if several root agents share one repo, deploy them separately. Use one repo per agent, or a script that `cd`s into each folder so each manifest is picked up. There is not one URL that selects a root agent inside a single runtime deploy. CI can build the container in GitLab (with its scanners) and deploy the artifact.

Observability: OpenTelemetry is on by default via an environment flag. Turn it off if you want. You do not add a separate tracing product to see sessions. Request and response logging for governance is optional; Sonika left it off. Traces show concurrent spans with timestamps and latency (session view, trace view, span view).

## Sessions

Sessions are not automatic in your own code. Create a session service with project, location, and engine id, and attach it to the agent. After that, a browser refresh keeps the same session. Add a new-chat button when you want a new thread. In the console, open a past session in the playground or inspect its traces and tool calls.

## Memory Bank

Attach a Vertex AI Memory Bank service to the agent (project, location, engine id). Memories are per agent and per user. Sub-agents share the parent agent's memories. They do not see another user's bank.

Define topics so only some facts are stored. The demo topic was posting style. Names and similar fields are blocked by data-loss-prevention policy. A callback scans the session after it ends and writes memories, so they show up after a short delay, not on the same turn.

## Front end

Set the API backend-origin environment variable to the same URL you used with curl. Social login uses a Google Cloud OAuth client; the client id goes into the Docker build, not only into the Cloud Run service env. Deploy the front end to Cloud Run with the lab script.

A private Cloud Run service can be reached without making it public:

`gcloud run services proxy SERVICE_NAME --region REGION --project PROJECT_ID --port 8090`

## Disk space (Antigravity, Ollama)

Natalia asked about cache growth. Clean tool caches and old project environments you are not using. Ollama models are the large files; remove models you are not running. Projects can live on an external drive. The session did not give exact megabyte figures.

## Other questions from the room

Andrii is extending a London Ukrainian Community agent from an earlier course. Ian is waiting until the deploy loop is clear, then building an e-learning course generator with a live tutor based on earlier quiz failures. Several people are watching the Professional Agentic Architect exam for when it is generally available.
