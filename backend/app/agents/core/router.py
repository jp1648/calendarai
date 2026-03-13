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
        # Web search queries
        "find the address of the new Italian restaurant downtown and book dinner Friday",
        "look up when the Taylor Swift concert is and add it to my calendar",
        "search for the nearest dentist and schedule an appointment",
        "what time does the Apple store close and schedule a visit",
        "find events happening this weekend in San Francisco",
        "search for the conference schedule and block out the sessions",
        "look up movie showtimes for Friday night",
        "what are the business hours for the DMV",
        # Restaurant / food queries
        "i want to eat mexican food this friday",
        "find me a good sushi place for dinner",
        "book a table for 4 at an italian restaurant",
        "where should we eat tonight",
        "find a restaurant near union square for tomorrow",
        "i want to try thai food this weekend",
        "dinner reservations for 6 people saturday night",
        "recommend a brunch spot for sunday",
        "find me restaurants near me with available reservations",
        "what restaurants have availability tonight",
        "find reservations near me for dinner",
        "search for restaurants with open tables tonight",
        "find me a place to eat tonight",
        "any good dinner spots available right now",
        # Reservation management
        "cancel my reservation",
        "cancel my dinner reservation tonight",
        "cancel my resy reservation",
        "show my upcoming reservations",
        "what reservations do I have",
        # Doctor / medical
        "schedule a doctor appointment",
        "find a dermatologist near me",
        "i need to see a doctor next week",
        # Dentist
        "book a dental cleaning",
        "find a dentist near me",
        "schedule a teeth cleaning for next thursday",
        # Haircut / salon
        "i need a haircut this saturday",
        "find a barber near downtown",
        "book a hair appointment",
        # Auto service
        "schedule an oil change",
        "find a mechanic near me",
        "i need to get my car inspected",
        # Fitness
        "book a yoga class tomorrow",
        "find a spin class near me",
        "sign me up for pilates this weekend",
        # Generic booking
        "book a spa appointment",
        "schedule a massage for friday",
        # Social / booking for others
        "book a dentist for me and Sarah",
        "find a time that works for me and john@example.com",
        "schedule lunch with Sarah next week",
        "when are me and Mike both free",
        "book a dinner for me and my partner",
        "set up a meeting with alex@company.com",
        # Gmail / email queries
        "check my email for events",
        "look through my emails for any upcoming events",
        "search my gmail for reservations",
        "find confirmation emails in my inbox",
        "check my email for meetings tomorrow",
        "do I have any booking confirmations in my email",
        "scan my inbox for flight confirmations",
        "read my latest emails",
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
