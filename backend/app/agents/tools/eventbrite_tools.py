"""Eventbrite event discovery tools for the AI agent."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.services.eventbrite import EventbriteClient

logger = logging.getLogger("calendarai.tools.eventbrite")


@tool_registry.register("search_events", category="events")
async def search_events(
    ctx: RunContext[AgentDeps],
    query: str,
    location: str = "",
    date_range: str = "",
    radius_miles: int = 25,
) -> dict:
    """Search for events near a location on Eventbrite.

    Use this when the user asks about events, concerts, workshops, meetups,
    festivals, or things to do nearby.

    Args:
        query: What to search for (e.g. "jazz concert", "tech meetup", "food festival")
        location: City or area to search in (uses user's default location if empty)
        date_range: Date range like "2026-03-15T00:00:00Z/2026-03-16T23:59:59Z" (ISO start/end separated by "/")
        radius_miles: Search radius in miles (default 25)
    """
    lat = ctx.deps.user_latitude
    lng = ctx.deps.user_longitude

    # Parse date range if provided
    start_date = None
    end_date = None
    if date_range and "/" in date_range:
        parts = date_range.split("/", 1)
        start_date = parts[0]
        end_date = parts[1]

    client = EventbriteClient()
    try:
        results = await client.search_events(
            query=query,
            latitude=lat,
            longitude=lng,
            radius=f"{radius_miles}mi",
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        logger.error("search_events failed: %s", e, exc_info=True)
        return {"error": f"Eventbrite search failed: {e}"}

    events = results.get("events", [])
    logger.info("search_events query=%r results=%d", query, len(events))

    return {
        "events": events[:10],
        "total": results.get("pagination", {}).get("object_count", len(events)),
        "tip": "Use get_event_details for full info, or import_event_to_calendar to add one to the calendar. Note: ticket purchases must be done on eventbrite.com directly.",
    }


@tool_registry.register("get_event_details", category="events")
async def get_event_details(
    ctx: RunContext[AgentDeps],
    event_id: str,
) -> dict:
    """Get full details for an Eventbrite event including venue and ticket availability.

    Args:
        event_id: The Eventbrite event ID (from search results)
    """
    logger.info("get_event_details id=%s", event_id)
    client = EventbriteClient()
    try:
        event = await client.get_event(event_id)
    except Exception as e:
        logger.error("get_event_details failed: %s", e, exc_info=True)
        return {"error": f"Failed to get event details: {e}"}

    return event


@tool_registry.register("import_event_to_calendar", category="events")
async def import_event_to_calendar(
    ctx: RunContext[AgentDeps],
    event_id: str,
) -> dict:
    """Import an Eventbrite event into the user's CalendarAI calendar.

    Creates a new calendar event with the event's title, times, location,
    and a link back to the Eventbrite page.

    Args:
        event_id: The Eventbrite event ID to import
    """
    logger.info("import_event_to_calendar user=%s event=%s", ctx.deps.user_id, event_id)

    client = EventbriteClient()
    try:
        event = await client.get_event(event_id)
    except Exception as e:
        logger.error("import_event_to_calendar fetch failed: %s", e, exc_info=True)
        return {"error": f"Failed to fetch event: {e}"}

    if not event.get("start"):
        return {"error": "Event has no start time"}

    # Build location from venue
    location = ""
    venue = event.get("venue")
    if venue:
        parts = [venue.get("name", ""), venue.get("address", "")]
        location = ", ".join(p for p in parts if p)

    description = event.get("description", "")[:2000]
    url = event.get("url", "")
    if url:
        description = f"{description}\n\nEventbrite: {url}".strip()

    sb = ctx.deps.supabase
    row = {
        "user_id": ctx.deps.user_id,
        "title": event.get("name", "Eventbrite Event"),
        "description": description,
        "location": location,
        "start_time": event["start"],
        "end_time": event.get("end", event["start"]),
        "all_day": False,
        "source": "eventbrite",
        "source_ref": event_id,
        "confidence": 1.0,
        "metadata": {
            "eventbrite_id": event_id,
            "eventbrite_url": url,
            "is_free": event.get("is_free", False),
        },
    }

    result = sb.table("events").insert(row).execute()
    created = result.data[0] if result.data else row

    return {
        "status": "imported",
        "event": created,
        "message": f"Added '{event.get('name', '')}' to your calendar.",
    }
