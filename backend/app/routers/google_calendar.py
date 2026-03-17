"""Google Calendar 2-way sync router."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.middleware import AuthUser, get_current_user
from app.services.encryption import decrypt
from app.services.gmail import get_gmail_credentials
from app.services.google_calendar import (
    list_calendars as gc_list_calendars,
    list_events as gc_list_events,
    create_event as gc_create_event,
    update_event as gc_update_event,
)
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/google-calendar", tags=["google-calendar"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_credentials(user_id: str):
    """Load Google credentials for the user. Raises 400 if Gmail not connected."""
    sb = get_supabase_admin()
    profile = (
        sb.table("profiles")
        .select("gmail_connected, gmail_refresh_token")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data or not profile.data.get("gmail_connected"):
        raise HTTPException(status_code=400, detail="Gmail/Google not connected")
    refresh_token = decrypt(profile.data["gmail_refresh_token"])
    return get_gmail_credentials(refresh_token)


def _get_user_tz(user_id: str) -> str:
    sb = get_supabase_admin()
    result = sb.table("profiles").select("timezone").eq("id", user_id).single().execute()
    return (result.data or {}).get("timezone", "America/New_York")


def _calendarai_event_to_gcal(event: dict) -> dict:
    """Convert a CalendarAI event row into a Google Calendar event body."""
    body: dict = {
        "summary": event.get("title", ""),
        "description": event.get("description", ""),
        "location": event.get("location", ""),
    }
    if event.get("all_day"):
        body["start"] = {"date": event["start_time"][:10]}
        body["end"] = {"date": event["end_time"][:10]}
    else:
        body["start"] = {"dateTime": event["start_time"]}
        body["end"] = {"dateTime": event["end_time"]}
    return body


def _gcal_event_to_row(gcal_event: dict, user_id: str) -> dict | None:
    """Convert a Google Calendar event into a CalendarAI events row dict.

    Returns None for cancelled/declined events that should be skipped.
    """
    if gcal_event.get("status") == "cancelled":
        return None

    start_raw = gcal_event.get("start", {})
    end_raw = gcal_event.get("end", {})

    all_day = "date" in start_raw and "dateTime" not in start_raw
    start_time = start_raw.get("dateTime") or start_raw.get("date")
    end_time = end_raw.get("dateTime") or end_raw.get("date")

    if not start_time or not end_time:
        return None

    return {
        "user_id": user_id,
        "title": gcal_event.get("summary", "(No title)"),
        "description": gcal_event.get("description", ""),
        "location": gcal_event.get("location", ""),
        "start_time": start_time,
        "end_time": end_time,
        "all_day": all_day,
        "source": "google_calendar",
        "source_ref": gcal_event["id"],
        "confidence": 1.0,
        "metadata": {
            "gcal_calendar_id": gcal_event.get("organizer", {}).get("email", "primary"),
            "gcal_html_link": gcal_event.get("htmlLink", ""),
        },
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/calendars")
async def list_calendars_endpoint(user: AuthUser = Depends(get_current_user)):
    """List all Google Calendars for the authenticated user."""
    creds = _get_credentials(user.id)
    calendars = await asyncio.to_thread(gc_list_calendars, creds)
    return [
        {
            "id": c["id"],
            "summary": c.get("summary", ""),
            "primary": c.get("primary", False),
            "backgroundColor": c.get("backgroundColor", ""),
        }
        for c in calendars
    ]


@router.get("/events")
async def list_events_endpoint(
    calendar_id: str = Query("primary"),
    start: Optional[str] = Query(None, description="RFC3339 start time"),
    end: Optional[str] = Query(None, description="RFC3339 end time"),
    user: AuthUser = Depends(get_current_user),
):
    """Fetch events from a Google Calendar."""
    creds = _get_credentials(user.id)
    events = await asyncio.to_thread(
        gc_list_events, creds, calendar_id=calendar_id, time_min=start, time_max=end
    )
    return events


class SyncRequest(BaseModel):
    calendar_id: str = "primary"
    days_back: int = 30
    days_forward: int = 90


@router.post("/sync")
async def sync_from_google(
    body: SyncRequest = SyncRequest(),
    user: AuthUser = Depends(get_current_user),
):
    """Pull Google Calendar events into the CalendarAI events table.

    Uses source_ref (Google event ID) for upsert deduplication.
    Batch-fetches existing refs to avoid N+1 queries.
    """
    creds = _get_credentials(user.id)
    tz_name = _get_user_tz(user.id)
    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)

    time_min = (now - timedelta(days=body.days_back)).isoformat()
    time_max = (now + timedelta(days=body.days_forward)).isoformat()

    gcal_events = await asyncio.to_thread(
        gc_list_events,
        creds,
        calendar_id=body.calendar_id,
        time_min=time_min,
        time_max=time_max,
    )

    sb = get_supabase_admin()

    # Batch-fetch all existing source_refs to avoid N+1 queries
    existing_result = (
        sb.table("events")
        .select("id, source_ref")
        .eq("user_id", user.id)
        .eq("source", "google_calendar")
        .execute()
    )
    ref_map = {row["source_ref"]: row["id"] for row in existing_result.data or []}

    created = 0
    updated = 0
    skipped = 0

    for ge in gcal_events:
        row = _gcal_event_to_row(ge, user.id)
        if row is None:
            skipped += 1
            continue

        existing_id = ref_map.get(ge["id"])
        if existing_id:
            update_data = {k: v for k, v in row.items() if k not in ("user_id", "source", "source_ref", "confidence")}
            sb.table("events").update(update_data).eq("id", existing_id).execute()
            updated += 1
        else:
            sb.table("events").insert(row).execute()
            created += 1

    return {"created": created, "updated": updated, "skipped": skipped}


@router.post("/push/{event_id}")
async def push_event_to_google(
    event_id: str,
    calendar_id: str = Query("primary"),
    user: AuthUser = Depends(get_current_user),
):
    """Push a single CalendarAI event to Google Calendar."""
    creds = _get_credentials(user.id)
    sb = get_supabase_admin()

    event = (
        sb.table("events")
        .select("*")
        .eq("id", event_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")

    gcal_body = _calendarai_event_to_gcal(event.data)

    # If the event already has a Google Calendar source_ref and came from gcal, update it
    if event.data.get("source") == "google_calendar" and event.data.get("source_ref"):
        gcal_event = await asyncio.to_thread(
            gc_update_event, creds, calendar_id, event.data["source_ref"], gcal_body
        )
    else:
        gcal_event = await asyncio.to_thread(gc_create_event, creds, calendar_id, gcal_body)
        sb.table("events").update({
            "source_ref": gcal_event["id"],
            "metadata": {
                **(event.data.get("metadata") or {}),
                "gcal_calendar_id": calendar_id,
                "gcal_html_link": gcal_event.get("htmlLink", ""),
            },
        }).eq("id", event_id).execute()

    return {"status": "pushed", "gcal_event_id": gcal_event["id"]}


@router.post("/push-all")
async def push_all_events(
    calendar_id: str = Query("primary"),
    user: AuthUser = Depends(get_current_user),
):
    """Push all CalendarAI events (that aren't already pushed or from Google Calendar) to Google Calendar."""
    creds = _get_credentials(user.id)
    sb = get_supabase_admin()

    tz_name = _get_user_tz(user.id)
    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)

    # Only push future events
    events = (
        sb.table("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", now.isoformat())
        .order("start_time")
        .execute()
    )

    pushed = 0
    skipped = 0

    for event in events.data or []:
        # Skip events that already have a source_ref (already pushed or from external source)
        if event.get("source_ref"):
            skipped += 1
            continue

        gcal_body = _calendarai_event_to_gcal(event)
        gcal_event = await asyncio.to_thread(gc_create_event, creds, calendar_id, gcal_body)

        sb.table("events").update({
            "source_ref": gcal_event["id"],
            "metadata": {
                **(event.get("metadata") or {}),
                "gcal_calendar_id": calendar_id,
                "gcal_html_link": gcal_event.get("htmlLink", ""),
            },
        }).eq("id", event["id"]).execute()

        pushed += 1

    return {"pushed": pushed, "skipped": skipped}
