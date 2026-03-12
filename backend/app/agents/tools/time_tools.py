from datetime import datetime
from zoneinfo import ZoneInfo

from dateutil import parser as dateutil_parser
from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry


@tool_registry.register("get_current_time", category="time")
async def get_current_time(ctx: RunContext[AgentDeps]) -> str:
    """Get the current date and time in the user's timezone."""
    tz = ZoneInfo(ctx.deps.user_timezone)
    now = datetime.now(tz)
    return now.isoformat()


@tool_registry.register("parse_datetime", category="time")
async def parse_datetime(
    ctx: RunContext[AgentDeps],
    text: str,
) -> str:
    """Parse a natural language date/time string into an ISO 8601 datetime.

    Args:
        text: Natural language date/time like 'tomorrow at noon' or 'next Friday 3pm'
    """
    tz = ZoneInfo(ctx.deps.user_timezone)
    now = datetime.now(tz)

    try:
        parsed = dateutil_parser.parse(text, fuzzy=True, default=now)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=tz)
        return parsed.isoformat()
    except (ValueError, OverflowError):
        return now.isoformat()
