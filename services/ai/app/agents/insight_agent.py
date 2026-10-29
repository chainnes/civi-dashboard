from __future__ import annotations

import re
from typing import Any

POSITIVE = {"love", "great", "thanks", "win", "proud", "hope", "together"}
NEGATIVE = {"hate", "angry", "broken", "scam", "unsafe", "lost", "fear"}


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z']+", text.lower()))


def analyze_post(title: str | None, body: str) -> dict[str, Any]:
    """Deterministic Phase 1 analyzer. Swap for an LLM agent when OPENAI_API_KEY is set."""
    blob = f"{title or ''} {body}"
    tokens = _tokens(blob)
    pos = len(tokens & POSITIVE)
    neg = len(tokens & NEGATIVE)
    if pos > neg:
        sentiment, score = "positive", min(0.95, 0.55 + 0.1 * pos)
    elif neg > pos:
        sentiment, score = "negative", min(0.95, 0.55 + 0.1 * neg)
    elif pos and neg:
        sentiment, score = "mixed", 0.5
    else:
        sentiment, score = "neutral", 0.5

    categories: list[str] = []
    if any(word in tokens for word in ("safety", "unsafe", "crime")):
        categories.append("safety")
    if any(word in tokens for word in ("event", "meetup", "festival")):
        categories.append("events")
    if any(word in tokens for word in ("housing", "rent", "transit")):
        categories.append("infrastructure")
    if not categories:
        categories.append("general")

    headline = (title or body[:80]).strip() or "Community signal"
    summary = (
        f"Sentiment is {sentiment}. Categories: {', '.join(categories)}. "
        "Treat this as a first-pass classification until the LLM agent is enabled."
    )
    actions = []
    if sentiment == "negative":
        actions.append({"type": "review", "label": "Route to community operators"})
    elif "events" in categories:
        actions.append({"type": "amplify", "label": "Surface on the events board"})

    return {
        "sentiment": sentiment,
        "sentiment_score": round(score, 3),
        "categories": categories,
        "headline": headline[:240],
        "summary": summary,
        "actions": actions,
        "agent_name": "insight-v1",
        "model": "heuristic-v1",
    }
