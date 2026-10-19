"""Pattern #2: AI decides; tools execute. Pattern #3: honour dry_run."""

from __future__ import annotations

from typing import Any


def resize_image(path: str, aspect_ratio: str, dry_run: bool = False) -> dict[str, Any]:
    if dry_run:
        return {
            "status": "skipped_dry_run",
            "would_resize": path,
            "aspect_ratio": aspect_ratio,
        }
    # Replace with a real image library / Cloud API in production.
    return {"status": "ok", "path": path, "aspect_ratio": aspect_ratio}


def stitch_clips(clip_paths: list[str], dry_run: bool = False) -> dict[str, Any]:
    if dry_run:
        return {
            "status": "skipped_dry_run",
            "would_stitch": clip_paths,
            "message": "No video generation / paid APIs in dry-run",
        }
    return {"status": "ok", "output": "out/final.mp4", "clips": len(clip_paths)}
