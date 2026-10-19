"""
ADK-oriented harness skeleton for DevCamp Optimise week.

Wire this into a real `google.adk` Agent once credentials are set.
The structure below mirrors ADK: specialists, tools, state, callbacks,
structured plan output, and right-sized models.
"""

from __future__ import annotations

import json
from typing import Any

from . import callbacks
from .platform_rules import get_platform_rules
from .tools import resize_image, stitch_clips

# Pattern #5 — different models for different tasks (set in ADK Agent config).
MODEL_ROUTER = "gemini-2.5-flash"  # cheap: routing / validation
MODEL_PLANNER = "gemini-2.5-pro"  # powerful: planning / reasoning
MODEL_WRITER = "gemini-2.5-flash"  # medium: content


PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "hook": {"type": "string"},
        "script": {"type": "string"},
        "cta": {"type": "string"},
        "platform": {"type": "string"},
        "clip_plan": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["hook", "script", "cta", "platform"],
}


def validate_input(request: dict[str, Any]) -> str | None:
    """Harness: input control before the agent runs."""
    if not request.get("topic"):
        return "topic is required"
    if not request.get("platform"):
        return "platform is required"
    return None


def build_prompt(request: dict[str, Any], rules: dict[str, Any]) -> str:
    """Pattern #6: send only what is required (no brand dump)."""
    return (
        "Create a short social plan as JSON matching the schema.\n"
        f"topic: {request['topic']}\n"
        f"platform: {request['platform']}\n"
        f"platform_rules: {json.dumps(rules)}\n"
        "Do not invent aspect ratios not in platform_rules."
    )


def run_harnessed(request: dict[str, Any], dry_run: bool = True) -> dict[str, Any]:
    """
    Demo orchestration (replace LLM calls with ADK LlmAgent + tools).

    Flow: validate → rules tool → plan (structured) → tools (respect dry_run) → report.
    """
    err = validate_input(request)
    if err:
        callbacks.record_failure(err)
        return {"status": "rejected", "error": err, "metrics": callbacks.METRICS.report()}

    rules = get_platform_rules(str(request["platform"]))
    if "error" in rules:
        callbacks.record_failure(rules["error"])
        return {"status": "rejected", "error": rules["error"], "metrics": callbacks.METRICS.report()}

    # Placeholder for ADK planner agent (MODEL_PLANNER) with response_schema=PLAN_SCHEMA.
    callbacks.before_model_callback()
    plan = {
        "hook": f"Hook for {request['topic']}",
        "script": "Short script placeholder — replace with ADK structured output.",
        "cta": "Learn more",
        "platform": request["platform"],
        "clip_plan": ["intro", "demo", "cta"],
    }

    # Pattern #7 validation of structured shape
    for key in PLAN_SCHEMA["required"]:
        if key not in plan:
            callbacks.record_failure(f"missing field {key}")
            return {"status": "invalid_plan", "metrics": callbacks.METRICS.report()}

    aspect = rules.get("aspect_ratio", "16:9")
    callbacks.after_tool_callback()
    resize_result = resize_image("assets/hero.png", str(aspect), dry_run=dry_run)

    callbacks.after_tool_callback()
    stitch_result = stitch_clips(
        [f"clip_{i}.mp4" for i in range(len(plan["clip_plan"]))],
        dry_run=dry_run,
    )

    return {
        "status": "dry_run_complete" if dry_run else "ok",
        "prompt_preview": build_prompt(request, rules),
        "plan": plan,
        "resize": resize_result,
        "stitch": stitch_result,
        "models": {
            "router": MODEL_ROUTER,
            "planner": MODEL_PLANNER,
            "writer": MODEL_WRITER,
        },
        "metrics": callbacks.METRICS.report(),
        "next": "Set dry_run=False only after verifying prompts, tools, and logic.",
    }


if __name__ == "__main__":
    print(
        json.dumps(
            run_harnessed(
                {"topic": "AI DevCamp Optimise week", "platform": "instagram_reels"},
                dry_run=True,
            ),
            indent=2,
        )
    )
