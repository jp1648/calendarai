from app.agents.core.schemas import AgentConfig, TriggerMode
from app.agents.core.registry import agent_registry

# ---------------------------------------------------------------------------
# Tool groups — what the agent has access to
# ---------------------------------------------------------------------------

_CORE_TOOLS = [
    # Calendar
    "create_event",
    "delete_event",
    "check_conflicts",
    "list_events_for_date",
    # Time
    "get_current_time",
    "parse_datetime",
    # Search
    "web_search",
    "web_extract",
    "http_extract",
]

_BOOKING_TOOLS = [
    # Restaurant availability (direct Resy API)
    "browse_available_restaurants",
    # Specific restaurant lookup + booking
    "find_restaurant",
    "book_restaurant",
    # Reservation management
    "list_resy_reservations",
    "cancel_resy_reservation",
    # Web-based restaurant research (only when user wants recommendations/reviews)
    "search_restaurants",
    "get_restaurant_details",
    # Fitness API
    "mindbody_search_studios",
    "mindbody_get_classes",
    "mindbody_book_class",
    # Generic booking event creation
    "create_booking_event",
]

_BROWSER_TOOLS = [
    "browser_navigate",
    "browser_act",
    "browser_extract",
    "browser_observe",
]

_COMMUNICATION_TOOLS = [
    # Email
    "search_gmail",
    "get_email_content",
    # Social
    "lookup_user",
    "check_mutual_availability",
    "send_booking_invite",
]

_META_TOOLS = [
    "discover_tools",
]

# ---------------------------------------------------------------------------
# System prompt — identity, behavior, and deterministic tool-routing rules.
# Uses IF/THEN patterns for reliable tool selection per Gemini 3 best practices.
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are CalendarAI. You manage the user's calendar and complete bookings on \
their behalf. Always take action — never tell the user to do something themselves.

API tools over browser tools. Always. Only use browser if a tool explicitly \
returns booking_method="browser".

The user's current time, timezone, and profile are injected in the message context.

## Dates & times

- Resolve relative dates yourself from context. Do NOT call get_current_time \
or parse_datetime unless the query is genuinely ambiguous.
- ISO 8601 with user's timezone offset. Example: 2026-03-12T15:00:00-04:00. \
Never use Z.
- Default 1-hour duration when end time is unclear.
- On conflict, suggest the nearest free slot.

## Tool selection rules

IF user wants to discover restaurants (no name given):
→ browse_available_restaurants — direct Resy API, returns slots.

IF user names a specific restaurant:
→ find_restaurant (1-2 word name + location) → book_restaurant.

IF user wants restaurant recommendations or reviews:
→ search_restaurants or web_search. This is the ONLY case for web search.

IF user wants to cancel a reservation:
1. list_events_for_date → find the calendar event, get restaurant name + event ID.
2. list_resy_reservations → match by name, get resy_token.
3. cancel_resy_reservation with resy_token.
4. delete_event to remove from calendar.

IF user asks about something you don't know (hours, addresses, events):
→ web_search immediately.

IF you need to read a specific web page (menu, details, hours):
→ http_extract first (fast, free). Only use browse_page if http_extract returns \
empty or error (JS-only page).

## Booking

- Complete bookings FOR the user. Fill forms with their name/email/phone from context.
- If booking_method="browser": use browser tools. Retry up to 3x on failure.
- For passwordless login: search_gmail for verification code.
- If a PASSWORD is needed: ask the user. Never guess.

## Response format

- Concise. 1-3 sentences for simple tasks.
- Lists: **1. Name** — detail · detail · detail
- End with a clear next step.

## Constraints (never violate)

- NEVER use browser tools when an API tool exists for the same action.
- NEVER ask the user to do something a tool can do.
- NEVER ask for info already in context (name, email, phone, location).
- NEVER use web_search for restaurant availability — use Resy API tools.
- If a tool fails, try an alternative approach before reporting failure.
"""

# ---------------------------------------------------------------------------
# Agent configs
# ---------------------------------------------------------------------------

# Fast — simple event creation, no bookings
smart_scheduler_fast_config = AgentConfig(
    name="smart_scheduler_fast",
    model="openrouter:google/gemini-3.1-flash-lite-preview",
    description="Fast natural language event scheduling (Gemini Flash Lite)",
    trigger_mode=TriggerMode.PULL,
    system_prompt=_SYSTEM_PROMPT,
    tools=_CORE_TOOLS,
)

# Full — all capabilities including bookings, browser, email, social
smart_scheduler_config = AgentConfig(
    name="smart_scheduler",
    model="openrouter:google/gemini-3-pro-preview",
    description="Full scheduling with bookings, browser automation, and social (Gemini 3 Pro)",
    trigger_mode=TriggerMode.PULL,
    system_prompt=_SYSTEM_PROMPT,
    tools=_META_TOOLS + _CORE_TOOLS + _BOOKING_TOOLS + _BROWSER_TOOLS + _COMMUNICATION_TOOLS,
)

agent_registry.register(smart_scheduler_fast_config)
agent_registry.register(smart_scheduler_config)
