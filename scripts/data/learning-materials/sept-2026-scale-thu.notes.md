# Scale — Theory (1 October 2026)

Session recording: https://www.youtube.com/watch?v=YSm5HeNw9oo
Agent Platform: https://cloud.google.com/products/agent-builder
ADK docs: https://google.github.io/adk-docs/
CopilotKit: https://www.copilotkit.ai/

Speaker: Sonika Janagill. Closed-group theory session for enrolled AI DevCamp attendees. Slides were to be posted on the programme site. Saturday's workshop is the hands-on deploy; bring an app that already runs locally.

## What scale means

Princess Okafor: scale is software that many people can use at the same time without crashing or running out of resources. Sonika: it is leaving the laptop so the agent can serve a large audience, and keeping user sessions, identities, and logs. A laptop has no autoscaling, no session persistence, no agent identity, and no central logging.

Industry context Sonika cited: about 33% of companies are projected to use agentic AI by 2028; about 15% of daily business decisions may run unsupervised by 2028; about 40% of agent products are projected to be cancelled by 2027 because of scaling trouble, cost, unclear value, and weak risk controls.

## Build recap

ADK is the open-source kit. An agent is a model, instructions, tools (MCP), and Agent Skills (knowledge loaded when needed). The cohort example is a multi-agent orchestrator for drafting, deep research, and social posting. The UI is CopilotKit on the AG-UI protocol.

In the Cloud console you move through Build, Scale, Govern, and Optimise. Agent Platform studio and the gallery have examples (for example a room-shot generator using Nano Banana 2). Ready-made MCP servers such as Jira already handle identity and security. Vector search and retrieval sit on embedding databases.

Retrieval-augmented generation (RAG) can be built with ADK libraries or pointed at an external embedding database. Vector Search builds indexes on data you already have in Vertex AI. Vector Search 2.0 creates searchable collections with embeddings and ranking, at a higher cost. Vertex AI handles autosync for external databases. Whether the RAG engine itself autosyncs, or that is only Vertex Search, was left as a follow-up.

## Scale-stage pieces

1. Agent Runtime — hosting.
2. Sessions — this conversation continues.
3. Memory Bank — long-term memory.
4. Sandboxes — code execution stays contained.
5. Agent Identity — the caller is the agent, not only the human who owns the project.

## Agent Runtime

- Warm start under 1 second, and fast provisioning.
- Long-running asynchronous work up to 7 days.
- Cap of 3,000 active agents per Google Cloud project.
- Languages: Python, Java, TypeScript, and Go. Frameworks include LangChain, LlamaIndex, and LangGraph, not only ADK.
- OpenTelemetry for logs and metrics.
- The platform manages hosting, autoscaling, IAM, streaming, and traffic splitting. You write the agent and its tests.

Five deploy methods:

- Dockerfile
- A linked code repository (Developer Connect)
- Upload Python source
- Artifact Registry
- Agent Platform SDK

Enabling the SDK API is a small cost. Most of the bill is Vertex AI model calls.

The web UI runs privately on Cloud Run. A Next.js proxy and Identity-Aware Proxy (IAP) pass identity tokens so the browser is not given a wide-open backend. Deploy flags covered in the session include project id, agent identity, environment variables, no-confirm project, and no-wait.

The monitoring dashboard (OpenTelemetry) shows request count, latency, call volume, agent invocations, and memory allocation.

## Sessions and Memory Bank

A session keeps history and state across a refresh. Every message is an event, and the session stores conversation state. You create one with a small class that takes the agent and the engine id.

Memory Bank is long-term memory across sessions: embedding similarity search and automatic consolidation. Topics default to a 90-day time-to-live. Different agents and different users have separate memory banks. Agent-to-agent protocols keep context and memory from leaking across those boundaries.

Cath asked whether the bank has a size limit and whether cost grows exponentially. Sonika: exact limits and prices are in the official docs. The bank can grow large because older memory moves into vector search, which is how storage stays usable. She was going to confirm the precise caps and the cost curve.

## Sandbox and Agent Identity

A sandbox limits code execution and access to other systems. Computer use lets the agent drive a browser and take screenshots when there is no API.

Agent Identity is IAM plus cryptographic credentials for that agent, so an action is not recorded only as "Sonika" when a specific agent did the work. You set what that identity is allowed to touch.

## Live demo

Deployed agent: private Cloud Run front end behind Identity-Aware Proxy, plus a local reverse proxy. The agent handled a request, drafted a social post, and stored memory under topics such as posting style. The console shows session traces, the agent topology, and a built-in playground.

## Calling the API yourself

Nanjundan asked about Postman and auth between a front end and the agent backend. The runtime exposes an API. Call it with a bearer token (Postman works). Do not hard-code a service-account key or a password. Prefer federated authentication. Renuka (GDG London) has connected a Flutter app on Firebase Hosting to a Google Cloud backend with Firebase Authentication.

## What to do before Saturday

Have the Build app running on your machine so you can follow the deploy steps. Weekly submission is both things: the lab for that week, and your own parallel agent. By the end of four weeks that is two production-ready agents. Do the lab first so the custom agent sits on the same ideas.

Multi-agent docs on the site were updated (sub-agent versus handoff). If a page looks stale, check Discord.

Staying current: YouTube, podcasts, and a Gemini gem that emails a digest from sources you bound. You can also build an agent that collects LinkedIn updates. Daniela has an agent that researches, drafts, and publishes articles using Agent Skills.
