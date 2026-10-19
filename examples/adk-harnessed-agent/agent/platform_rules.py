"""Pattern #1: don't ask the model what your code already knows."""

PLATFORM_RULES = {
    "instagram_reels": {
        "aspect_ratio": "9:16",
        "orientation": "vertical",
    },
    "linkedin_video": {
        "aspect_ratio": "1:1 or 16:9",
        "orientation": "square_or_wide",
    },
}


def get_platform_rules(platform: str) -> dict:
    key = platform.strip().lower().replace(" ", "_")
    return PLATFORM_RULES.get(key, {"error": f"unknown platform: {platform}"})
