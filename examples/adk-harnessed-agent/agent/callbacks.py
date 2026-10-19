"""Pattern #4: measure everything (model calls, tools, retries)."""

from __future__ import annotations

from typing import Any


class RunMetrics:
    def __init__(self) -> None:
        self.model_calls = 0
        self.tool_calls = 0
        self.retries = 0
        self.failures: list[str] = []

    def report(self) -> dict[str, Any]:
        return {
            "model_calls": self.model_calls,
            "tool_calls": self.tool_calls,
            "retries": self.retries,
            "failures": list(self.failures),
        }


METRICS = RunMetrics()


def before_model_callback(*_args: Any, **_kwargs: Any) -> None:
    METRICS.model_calls += 1


def after_tool_callback(*_args: Any, **_kwargs: Any) -> None:
    METRICS.tool_calls += 1


def record_failure(message: str) -> None:
    METRICS.failures.append(message)
