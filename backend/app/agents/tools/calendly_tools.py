"""Calendly agent tools — event types, scheduled events, and cancellation."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.services.calendly import CalendlyClient
from app.services.encryption import decrypt
from app.services.supabase import get_supabase_admin

logger = logging.getLogger("calendarai.tools.calendly")


def _get_calendly_client(user_id: str) -> tuple[CalendlyClient, str] | None:
    """Load Calendly credentials for a user. Returns (client, user_uri) or None."""
    sb = get_supabase_admin()
    row = (
        sb.table("profiles")
        .select("calendly_access_token, calendly_user_uri")
        .eq("id", user_id)
        .eq("calendly_connected", True)
        .single()
        .execute()
    )
    if not row.data or not row.data.get("calendly_access_token"):
        return None
    access_token = decrypt(row.data["calendly_access_token"])
    user_uri = row.data.get("calendly_user_uri", "")
    return CalendlyClient(access_token), user_uri


@tool_registry.register("list_calendly_event_types", category="calendly")
async def list_calendly_event_types(
    ctx: RunContext[AgentDeps],
) -> dict:
    """List the user's Calendly event types (booking pages).

    Returns the event types configured in the user's Calendly account,
    including name, duration, and scheduling URL.
    """
    result = _get_calendly_client(ctx.deps.user_id)
    if not result:
        return {"error": "Calendly not connected. Ask the user to link their Calendly account in Settings."}

    client, user_uri = result
    try:
        event_types = await client.list_event_types(user_uri)
        return {
            "event_types": [
                {
                    "name": et.get("name", ""),
                    "slug": et.get("slug", ""),
                    "duration": et.get("duration", 0),
                    "scheduling_url": et.get("scheduling_url", ""),
                    "active": et.get("active", False),
                }
                for et in event_types
            ]
        }
    except Exception as e:
        logger.error("list_calendly_event_types failed: %s", e)
        return {"error": f"Failed to fetch Calendly event types: {e}"}


@tool_registry.register("list_calendly_events", category="calendly")
async def list_calendly_events(
    ctx: RunContext[AgentDeps],
    min_start_time: str = "",
    max_start_time: str = "",
) -> dict:
    """List the user's scheduled Calendly events within a date range.

    Args:
        min_start_time: ISO 8601 datetime for the earliest event start (e.g. '2026-03-15T00:00:00Z')
        max_start_time: ISO 8601 datetime for the latest event start (e.g. '2026-03-22T00:00:00Z')
    """
    result = _get_calendly_client(ctx.deps.user_id)
    if not result:
        return {"error": "Calendly not connected. Ask the user to link their Calendly account in Settings."}

    client, user_uri = result
    try:
        events = await client.list_scheduled_events(
            user_uri,
            min_start_time=min_start_time or None,
            max_start_time=max_start_time or None,
        )
        return {
            "events": [
                {
                    "uri": ev.get("uri", ""),
                    "name": ev.get("name", ""),
                    "status": ev.get("status", ""),
                    "start_time": ev.get("start_time", ""),
                    "end_time": ev.get("end_time", ""),
                    "event_type": ev.get("event_type", ""),
                    "location": ev.get("location", {}),
                }
                for ev in events
            ]
        }
    except Exception as e:
        logger.error("list_calendly_events failed: %s", e)
        return {"error": f"Failed to fetch Calendly events: {e}"}


@tool_registry.register("cancel_calendly_event", category="calendly")
async def cancel_calendly_event(
    ctx: RunContext[AgentDeps],
    event_uuid: str,
    reason: str = "",
) -> dict:
    """Cancel a scheduled Calendly event.

    Args:
        event_uuid: The UUID of the scheduled event to cancel (from list_calendly_events)
        reason: Optional cancellation reason
    """
    result = _get_calendly_client(ctx.deps.user_id)
    if not result:
        return {"error": "Calendly not connected. Ask the user to link their Calendly account in Settings."}

    client, _ = result
    try:
        cancellation = await client.cancel_event(event_uuid, reason=reason)
        return {"status": "cancelled", "cancellation": cancellation}
    except Exception as e:
        logger.error("cancel_calendly_event failed: %s", e)
        return {"error": f"Failed to cancel Calendly event: {e}"}
