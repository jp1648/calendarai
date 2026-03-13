from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry


def _ensure_tz(dt_str: str, user_tz: str) -> str:
    """Ensure datetime has the user's timezone.

    - Naive datetimes → assume user's timezone
    - UTC datetimes when user isn't in UTC → treat as user-local time
      (agents often send '15:00:00Z' meaning '3pm local', not '3pm UTC')
    """
    dt = datetime.fromisoformat(dt_str)
    tz = ZoneInfo(user_tz)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    elif dt.utcoffset() == timedelta(0) and user_tz != "UTC":
        # Agent sent UTC but user isn't in UTC — treat as user-local
        dt = dt.replace(tzinfo=tz)
    return dt.isoformat()


@tool_registry.register("create_event", category="calendar")
async def create_event(
    ctx: RunContext[AgentDeps],
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = "",
    all_day: bool = False,
    source: str = "schedule_agent",
    source_ref: str | None = None,
    confidence: float = 1.0,
) -> dict:
    """Create a calendar event for the user.

    Args:
        title: Event title
        start_time: ISO 8601 datetime string for start
        end_time: ISO 8601 datetime string for end
        description: Optional event description
        location: Optional location
        all_day: Whether this is an all-day event
        source: Event source - 'schedule_agent' or 'email_agent'
        source_ref: Optional reference to source (e.g. Gmail message ID)
        confidence: Confidence score 0-1 for AI-generated events
    """
    tz = ctx.deps.user_timezone
    sb = ctx.deps.supabase
    row = {
        "user_id": ctx.deps.user_id,
        "title": title,
        "description": description,
        "location": location,
        "start_time": _ensure_tz(start_time, tz),
        "end_time": _ensure_tz(end_time, tz),
        "all_day": all_day,
        "source": source,
        "source_ref": source_ref,
        "confidence": confidence,
        "undo_available": True,
    }
    result = sb.table("events").insert(row).execute()
    return result.data[0]


@tool_registry.register("check_conflicts", category="calendar")
async def check_conflicts(
    ctx: RunContext[AgentDeps],
    start_time: str,
    end_time: str,
) -> list[dict]:
    """Check for conflicting events in a time range.

    Args:
        start_time: ISO 8601 datetime string for range start
        end_time: ISO 8601 datetime string for range end
    """
    tz = ctx.deps.user_timezone
    sb = ctx.deps.supabase
    result = (
        sb.table("events")
        .select("id, title, start_time, end_time")
        .eq("user_id", ctx.deps.user_id)
        .lt("start_time", _ensure_tz(end_time, tz))
        .gt("end_time", _ensure_tz(start_time, tz))
        .execute()
    )
    return result.data


@tool_registry.register("list_events_for_date", category="calendar")
async def list_events_for_date(
    ctx: RunContext[AgentDeps],
    date: str,
) -> list[dict]:
    """List all events for a specific date.

    Args:
        date: Date in YYYY-MM-DD format
    """
    tz = ctx.deps.user_timezone
    sb = ctx.deps.supabase
    day_start = _ensure_tz(f"{date}T00:00:00", tz)
    day_end = _ensure_tz(f"{date}T23:59:59", tz)
    result = (
        sb.table("events")
        .select("id, title, start_time, end_time, location")
        .eq("user_id", ctx.deps.user_id)
        .gte("start_time", day_start)
        .lt("start_time", day_end)
        .order("start_time")
        .execute()
    )
    return result.data


@tool_registry.register("delete_event", category="calendar")
async def delete_event(
    ctx: RunContext[AgentDeps],
    event_id: str,
) -> dict:
    """Delete a calendar event by its ID.

    Args:
        event_id: The UUID of the event to delete
    """
    sb = ctx.deps.supabase
    result = (
        sb.table("events")
        .delete()
        .eq("id", event_id)
        .eq("user_id", ctx.deps.user_id)
        .execute()
    )
    if not result.data:
        return {"error": "Event not found"}
    return {"deleted": True, "event_id": event_id}
