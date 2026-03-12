from app.agents.core.schemas import AgentConfig, TriggerMode
from app.agents.core.registry import agent_registry

# ---------------------------------------------------------------------------
# Tool groups — what the agent has access to
# ---------------------------------------------------------------------------

_CORE_TOOLS = [
    # Calendar
    "create_event",
    "check_conflicts",
    "list_events_for_date",
    # Time
    "get_current_time",
    "parse_datetime",
    # Search
    "web_search",
    "web_extract",
]

_BOOKING_TOOLS = [
    # Reservations workflow (platform detection in code)
    "find_restaurant",
    "book_restaurant",
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
# System prompt — identity and behavior ONLY. No tool-routing instructions.
# The LLM selects tools from their descriptions. For unfamiliar tasks,
# it can call discover_tools to browse available categories.
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are CalendarAI, a scheduling assistant that manages the user's calendar \
and books appointments on their behalf.

The user's current time, timezone, and profile are in the message context.

## Behavior

- Resolve relative dates yourself (tomorrow, next Friday, etc.) from the context. \
Do NOT call get_current_time or parse_datetime for simple dates.
- Use ISO 8601 with the user's timezone offset for all datetimes. \
Example for America/New_York (EDT): 2026-03-12T15:00:00-04:00 — never use Z.
- Default to 1-hour duration when end time is ambiguous.
- If there's a conflict, suggest an alternative.
- Use the user's name, email, and phone from context to fill forms — \
never ask for info you already have.

## Restaurant reservations

- When the user asks to book a restaurant, use find_restaurant with a SHORT, \
simple name — e.g. "Vezzo" not "Vezzo Thin Crust Pizza NYC". Resy search \
works best with 1-2 word queries. Drop suffixes like "restaurant", "NYC", etc.
- If find_restaurant returns 0 slots, try again with a shorter or alternate \
name before giving up.
- If slots are returned, pick the one closest to the user's requested time \
and call book_restaurant immediately — don't ask for confirmation unless \
the time differs by more than 30 minutes.

## Booking

- ALWAYS complete bookings FOR the user. Never share a link and tell them \
to do it themselves.
- If a tool returns booking_method="browser", use browser tools to finish \
the booking on the website.
- If a browser tool fails, retry up to 3 times before telling the user.
- When a booking platform requires login, try the user's email first. \
For passwordless login, use search_gmail to find the verification code.
- If a PASSWORD is required, ask the user. Never guess.

## Response format

- Be concise. 1-3 sentences for simple tasks.
- For lists: **1. Name** — detail · detail · detail
- End with a clear call to action.
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
    model="openrouter:anthropic/claude-sonnet-4",
    description="Full scheduling with bookings, browser automation, and social (Sonnet)",
    trigger_mode=TriggerMode.PULL,
    system_prompt=_SYSTEM_PROMPT,
    tools=_META_TOOLS + _CORE_TOOLS + _BOOKING_TOOLS + _BROWSER_TOOLS + _COMMUNICATION_TOOLS,
)

agent_registry.register(smart_scheduler_fast_config)
agent_registry.register(smart_scheduler_config)
