from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry


@tool_registry.register("create_event")
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
    sb = ctx.deps.supabase
    row = {
        "user_id": ctx.deps.user_id,
        "title": title,
        "description": description,
        "location": location,
        "start_time": start_time,
        "end_time": end_time,
        "all_day": all_day,
        "source": source,
        "source_ref": source_ref,
        "confidence": confidence,
        "undo_available": True,
    }
    result = sb.table("events").insert(row).execute()
    return result.data[0]


@tool_registry.register("check_conflicts")
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
    sb = ctx.deps.supabase
    result = (
        sb.table("events")
        .select("id, title, start_time, end_time")
        .eq("user_id", ctx.deps.user_id)
        .lt("start_time", end_time)
        .gt("end_time", start_time)
        .execute()
    )
    return result.data


@tool_registry.register("list_events_for_date")
async def list_events_for_date(
    ctx: RunContext[AgentDeps],
    date: str,
) -> list[dict]:
    """List all events for a specific date.

    Args:
        date: Date in YYYY-MM-DD format
    """
    sb = ctx.deps.supabase
    result = (
        sb.table("events")
        .select("id, title, start_time, end_time, location")
        .eq("user_id", ctx.deps.user_id)
        .gte("start_time", f"{date}T00:00:00")
        .lt("start_time", f"{date}T23:59:59")
        .order("start_time")
        .execute()
    )
    return result.data
