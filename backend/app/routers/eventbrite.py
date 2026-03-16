"""Eventbrite integration — OAuth, event search, and calendar import."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.auth.middleware import AuthUser, get_current_user
from app.auth.oauth_state import sign_state, verify_state
from app.config import get_settings
from app.services.encryption import encrypt, decrypt
from app.services.eventbrite import (
    EventbriteClient,
    exchange_oauth_code,
    get_oauth_authorize_url,
)
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/eventbrite", tags=["eventbrite"])
logger = logging.getLogger("calendarai.eventbrite.router")


# ---------------------------------------------------------------------------
# OAuth
# ---------------------------------------------------------------------------

@router.get("/auth-url")
async def get_auth_url(user: AuthUser = Depends(get_current_user)):
    """Get the Eventbrite OAuth authorization URL."""
    url = get_oauth_authorize_url(sign_state(user.id))
    return {"url": url}


@router.get("/callback")
async def oauth_callback(code: str, state: str):
    """Handle OAuth callback from Eventbrite."""
    user_id = verify_state(state)
    settings = get_settings()
    sb = get_supabase_admin()

    try:
        token_data = await exchange_oauth_code(code)
    except Exception:
        logger.exception("Eventbrite OAuth token exchange failed")
        raise HTTPException(status_code=502, detail="Failed to complete Eventbrite authorization")

    access_token = token_data.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=502, detail="No access token returned from Eventbrite")

    sb.table("profiles").update({
        "eventbrite_connected": True,
        "eventbrite_access_token": encrypt(access_token),
    }).eq("id", user_id).execute()

    return RedirectResponse(url=settings.frontend_url + "/settings", status_code=303)


@router.post("/unlink")
async def unlink(user: AuthUser = Depends(get_current_user)):
    """Disconnect Eventbrite account."""
    sb = get_supabase_admin()
    sb.table("profiles").update({
        "eventbrite_connected": False,
        "eventbrite_access_token": None,
    }).eq("id", user.id).execute()
    return {"status": "unlinked"}


# ---------------------------------------------------------------------------
# Public event search (API key only — no OAuth required)
# ---------------------------------------------------------------------------

@router.get("/search")
async def search_events(
    query: str = Query("", description="Search keywords"),
    lat: float | None = Query(None, description="Latitude"),
    lng: float | None = Query(None, description="Longitude"),
    radius: str = Query("25mi", description="Search radius, e.g. 25mi or 10km"),
    start_date: str | None = Query(None, description="ISO 8601 range start"),
    end_date: str | None = Query(None, description="ISO 8601 range end"),
    user: AuthUser = Depends(get_current_user),
):
    """Search public events on Eventbrite. No OAuth required — uses API key."""
    client = EventbriteClient()
    try:
        results = await client.search_events(
            query=query,
            latitude=lat,
            longitude=lng,
            radius=radius,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception:
        logger.exception("Eventbrite search failed")
        raise HTTPException(status_code=502, detail="Eventbrite search failed")

    return results


# ---------------------------------------------------------------------------
# Event details
# ---------------------------------------------------------------------------

@router.get("/events/{event_id}")
async def get_event_details(
    event_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Get full details for an Eventbrite event."""
    client = EventbriteClient()
    try:
        event = await client.get_event(event_id)
    except Exception:
        logger.exception("Eventbrite get event failed for id=%s", event_id)
        raise HTTPException(status_code=502, detail="Failed to fetch event details")

    return event


# ---------------------------------------------------------------------------
# Import event to CalendarAI
# ---------------------------------------------------------------------------

@router.post("/import/{event_id}")
async def import_event(
    event_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """Import an Eventbrite event into the user's CalendarAI calendar."""
    client = EventbriteClient()
    try:
        event = await client.get_event(event_id)
    except Exception:
        logger.exception("Eventbrite get event failed for import id=%s", event_id)
        raise HTTPException(status_code=502, detail="Failed to fetch event for import")

    if not event.get("start"):
        raise HTTPException(status_code=400, detail="Event has no start time")

    # Build location string from venue
    location = ""
    venue = event.get("venue")
    if venue:
        parts = [venue.get("name", ""), venue.get("address", "")]
        location = ", ".join(p for p in parts if p)

    sb = get_supabase_admin()

    # Dedup — check if already imported
    existing = (
        sb.table("events")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "eventbrite")
        .eq("source_ref", event_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Event already imported")

    # Get user timezone
    profile = sb.table("profiles").select("timezone").eq("id", user.id).single().execute()
    user_tz = (profile.data or {}).get("timezone", "America/New_York")

    row = {
        "user_id": user.id,
        "title": event.get("name", "Eventbrite Event"),
        "description": event.get("description", "")[:2000],
        "location": location,
        "start_time": event["start"],
        "end_time": event.get("end", event["start"]),
        "all_day": False,
        "source": "eventbrite",
        "source_ref": event_id,
        "confidence": 1.0,
        "metadata": {
            "eventbrite_id": event_id,
            "eventbrite_url": event.get("url", ""),
            "is_free": event.get("is_free", False),
        },
    }

    result = sb.table("events").insert(row).execute()
    return result.data[0]
