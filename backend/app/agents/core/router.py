"""Semantic query router — picks the right model tier based on query meaning.

Uses local embeddings (all-MiniLM-L6-v2) + cosine similarity.
No LLM call, ~7ms per classification.
"""

import logging

from semantic_router import Route, SemanticRouter
from semantic_router.encoders import HuggingFaceEncoder

logger = logging.getLogger("calendarai.router")

# Local embedding model — no API calls, runs on CPU
_encoder = HuggingFaceEncoder(name="sentence-transformers/all-MiniLM-L6-v2")

# Simple scheduling: direct event creation with clear details provided
_simple = Route(
    name="simple",
    utterances=[
        "lunch tomorrow at noon",
        "dentist March 15 at 10am",
        "meeting with Bob Friday 3pm",
        "dinner tonight at 7",
        "call with Sarah at 2pm tomorrow",
        "gym Monday 6am",
        "flight to NYC on March 20",
        "haircut next Tuesday at 11",
        "coffee with Mike Wednesday 9am",
        "team standup at 10am",
        "pick up kids at 3:30",
        "doctor appointment Thursday 2pm",
        "date night Saturday 7pm",
        "submit report by Friday 5pm",
        "yoga class tomorrow 8am",
        "book a meeting room for 2pm",
        "add birthday party Saturday at 3",
        "reminder to take medicine at 9pm",
        "project demo next Monday 1pm",
        "1 on 1 with manager Thursday 11am",
    ],
    score_threshold=0.3,
)

# Complex scheduling: needs reasoning, search, conflict resolution, or multi-step logic
_complex = Route(
    name="complex",
    utterances=[
        "find me a free slot next week for a 2 hour meeting",
        "reschedule my Tuesday meeting to Wednesday",
        "what does my Friday look like",
        "when am I free this week",
        "move my 3pm meeting to tomorrow",
        "find the best time for a team lunch",
        "cancel all my meetings on Thursday",
        "what's my schedule for next week",
        "block out focus time every morning",
        "set up a recurring weekly standup",
        "find a time that works for both me and Sarah",
        "optimize my Wednesday schedule",
        "when can I fit a 90 minute workout",
        "reschedule everything from Monday to Tuesday",
        "what free time do I have between 9 and 5 tomorrow",
        "find my reservations when I have free time",
        "am I double booked anywhere this week",
        "clear my afternoon",
        "show me my busiest day this week",
        "how many hours of meetings do I have",
    ],
    score_threshold=0.3,
)

_router = SemanticRouter(encoder=_encoder, routes=[_simple, _complex], auto_sync="local")


def pick_scheduler(user_input: str) -> str:
    """Route to the appropriate scheduler agent based on query semantics.

    Returns 'smart_scheduler_fast' (Haiku) for simple queries,
    'smart_scheduler' (Sonnet) for complex ones.
    Unmatched queries default to Haiku.
    """
    result = _router(user_input)
    route = result.name or "simple"

    logger.info("route=%s input=%s", route, user_input[:80])

    if route == "complex":
        return "smart_scheduler"       # Sonnet
    return "smart_scheduler_fast"      # Haiku
