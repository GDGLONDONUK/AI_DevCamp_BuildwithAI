# ADK harnessed agent (Optimise patterns)

Minimal **Google ADK** skeleton showing harness patterns from DevCamp Optimise week. Prefer this stack for cohort agents over ad-hoc Gemini chat loops.

Official docs: [ADK](https://google.github.io/adk-docs/) · Same principles for this site’s Learning Chat / MCP: [`docs/15-agent-harnessing-optimisation.md`](../../docs/15-agent-harnessing-optimisation.md) (concepts only — no third-party workshop slides in git).

## Patterns encoded here

1. **Config over prompts** — `platform_rules.py` (pattern #1)
2. **Tools execute** — `tools.py` resize/stitch stubs (pattern #2)
3. **Dry-run** — `state["dry_run"]` skips expensive tools (pattern #3)
4. **Measure** — `callbacks.py` counts model/tool calls (pattern #4)
5. **Right-size models** — Flash for validate; stronger for plan (pattern #5)
6. **Small context** — only task fields in the prompt (pattern #6)
7. **Structured output** — JSON schema for the plan (pattern #7)

## Setup

```bash
# Python 3.11+ recommended
pip install google-adk
# Configure Vertex / Gemini auth per ADK docs
python -m agent  # or follow ADK `adk run` / Agent Studio export
```

Copy `agent/` into your own project; replace stubs with real Vertex / Media tools. Keep Model Armor / DLP from Govern week on ingress/egress when you go live.
