"""Agent tools for Google Calendar 2-way sync."""

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.services.google_calendar import (
    list_events as gc_list_events,
    create_event as gc_create_event,
)

logger = logging.getLogger("calendarai.tools.gcal")


@tool_registry.register("sync_google_calendar", category="calendar")
async def sync_google_calendar(
    ctx: RunContext[AgentDeps],
    calendar_id: str = "primary",
    days_back: int = 30,
    days_forward: int = 90,
) -> dict:
    """Sync events FROM Google Calendar into CalendarAI.

    Args:
        calendar_id: Google Calendar ID to sync from (default "primary")
        days_back: How many days in the past to sync
        days_forward: How many days in the future to sync
    """
    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Google account not connected. Ask the user to connect Gmail first."}

    try:
        tz = ZoneInfo(ctx.deps.user_timezone)
        now = datetime.now(tz)
        time_min = (now - timedelta(days=days_back)).isoformat()
        time_max = (now + timedelta(days=days_forward)).isoformat()

        gcal_events = gc_list_events(
            creds, calendar_id=calendar_id, time_min=time_min, time_max=time_max
        )

        sb = ctx.deps.supabase
        created = 0
        updated = 0

        for ge in gcal_events:
            if ge.get("status") == "cancelled":
                continue

            start_raw = ge.get("start", {})
            end_raw = ge.get("end", {})
            all_day = "date" in start_raw and "dateTime" not in start_raw
            start_time = start_raw.get("dateTime") or start_raw.get("date")
            end_time = end_raw.get("dateTime") or end_raw.get("date")
            if not start_time or not end_time:
                continue

            row = {
                "user_id": ctx.deps.user_id,
                "title": ge.get("summary", "(No title)"),
                "description": ge.get("description", ""),
                "location": ge.get("location", ""),
                "start_time": start_time,
                "end_time": end_time,
                "all_day": all_day,
                "source": "google_calendar",
                "source_ref": ge["id"],
                "confidence": 1.0,
            }

            existing = (
                sb.table("events")
                .select("id")
                .eq("user_id", ctx.deps.user_id)
                .eq("source", "google_calendar")
                .eq("source_ref", ge["id"])
                .execute()
            )

            if existing.data:
                update_data = {k: v for k, v in row.items() if k not in ("user_id", "source", "source_ref", "confidence")}
                sb.table("events").update(update_data).eq("id", existing.data[0]["id"]).execute()
                updated += 1
            else:
                sb.table("events").insert(row).execute()
                created += 1

        return {"status": "synced", "created": created, "updated": updated}
    except Exception as e:
        logger.error("sync_google_calendar failed: %s", e)
        return {"error": f"Google Calendar sync failed: {e}"}


@tool_registry.register("push_event_to_google_calendar", category="calendar")
async def push_event_to_google_calendar(
    ctx: RunContext[AgentDeps],
    event_id: str,
    calendar_id: str = "primary",
) -> dict:
    """Push a CalendarAI event to Google Calendar.

    Args:
        event_id: The CalendarAI event ID to push
        calendar_id: Target Google Calendar ID (default "primary")
    """
    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Google account not connected. Ask the user to connect Gmail first."}

    try:
        sb = ctx.deps.supabase
        event = (
            sb.table("events")
            .select("*")
            .eq("id", event_id)
            .eq("user_id", ctx.deps.user_id)
            .single()
            .execute()
        )
        if not event.data:
            return {"error": "Event not found"}

        ev = event.data
        body: dict = {
            "summary": ev.get("title", ""),
            "description": ev.get("description", ""),
            "location": ev.get("location", ""),
        }
        if ev.get("all_day"):
            body["start"] = {"date": ev["start_time"][:10]}
            body["end"] = {"date": ev["end_time"][:10]}
        else:
            body["start"] = {"dateTime": ev["start_time"]}
            body["end"] = {"dateTime": ev["end_time"]}

        gcal_event = gc_create_event(creds, calendar_id, body)

        sb.table("events").update({
            "source_ref": gcal_event["id"],
            "metadata": {
                **(ev.get("metadata") or {}),
                "gcal_calendar_id": calendar_id,
                "gcal_html_link": gcal_event.get("htmlLink", ""),
            },
        }).eq("id", event_id).execute()

        return {"status": "pushed", "gcal_event_id": gcal_event["id"]}
    except Exception as e:
        logger.error("push_event_to_google_calendar failed: %s", e)
        return {"error": f"Failed to push event: {e}"}


@tool_registry.register("list_google_calendar_events", category="calendar")
async def list_google_calendar_events(
    ctx: RunContext[AgentDeps],
    calendar_id: str = "primary",
    days_forward: int = 7,
) -> dict:
    """List upcoming events from the user's Google Calendar.

    Args:
        calendar_id: Google Calendar ID (default "primary")
        days_forward: How many days ahead to look (default 7)
    """
    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Google account not connected. Ask the user to connect Gmail first."}

    try:
        tz = ZoneInfo(ctx.deps.user_timezone)
        now = datetime.now(tz)
        time_min = now.isoformat()
        time_max = (now + timedelta(days=days_forward)).isoformat()

        events = gc_list_events(
            creds, calendar_id=calendar_id, time_min=time_min, time_max=time_max
        )

        return {
            "events": [
                {
                    "id": e["id"],
                    "summary": e.get("summary", "(No title)"),
                    "start": e.get("start", {}),
                    "end": e.get("end", {}),
                    "location": e.get("location", ""),
                    "status": e.get("status", ""),
                }
                for e in events
                if e.get("status") != "cancelled"
            ]
        }
    except Exception as e:
        logger.error("list_google_calendar_events failed: %s", e)
        return {"error": f"Failed to list events: {e}"}
