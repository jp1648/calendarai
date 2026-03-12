from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth.middleware import AuthUser, get_current_user
from app.services.supabase import get_supabase_admin


def _ensure_tz(dt: datetime, user_tz: str) -> str:
    """Ensure datetime has the user's timezone before storing."""
    tz = ZoneInfo(user_tz)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    elif dt.utcoffset() == timedelta(0) and user_tz != "UTC":
        dt = dt.replace(tzinfo=tz)
    return dt.isoformat()


def _get_user_tz(user_id: str) -> str:
    sb = get_supabase_admin()
    result = sb.table("profiles").select("timezone").eq("id", user_id).single().execute()
    return (result.data or {}).get("timezone", "America/New_York")

router = APIRouter(prefix="/api/events", tags=["events"])


class EventCreate(BaseModel):
    title: str
    description: str = ""
    location: str = ""
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    source: str = "manual"
    source_ref: str | None = None
    confidence: float = 1.0
    metadata: dict | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    all_day: bool | None = None


@router.get("")
async def list_events(
    start: Optional[str] = Query(None, description="ISO date for range start"),
    end: Optional[str] = Query(None, description="ISO date for range end"),
    user: AuthUser = Depends(get_current_user),
):
    sb = get_supabase_admin()
    query = sb.table("events").select("*").eq("user_id", user.id)
    if start:
        query = query.gte("start_time", start)
    if end:
        query = query.lte("start_time", end)
    query = query.order("start_time")
    result = query.execute()
    return result.data


@router.get("/{event_id}")
async def get_event(event_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase_admin()
    result = (
        sb.table("events")
        .select("*")
        .eq("id", event_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(body: EventCreate, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase_admin()
    tz = _get_user_tz(user.id)
    row = {
        "user_id": user.id,
        **body.model_dump(exclude_none=True),
        "start_time": _ensure_tz(body.start_time, tz),
        "end_time": _ensure_tz(body.end_time, tz),
    }
    result = sb.table("events").insert(row).execute()
    return result.data[0]


@router.patch("/{event_id}")
async def update_event(
    event_id: str, body: EventUpdate, user: AuthUser = Depends(get_current_user)
):
    sb = get_supabase_admin()
    tz = _get_user_tz(user.id)
    updates = body.model_dump(exclude_none=True)
    if "start_time" in updates:
        updates["start_time"] = _ensure_tz(updates["start_time"], tz)
    if "end_time" in updates:
        updates["end_time"] = _ensure_tz(updates["end_time"], tz)
    result = (
        sb.table("events")
        .update(updates)
        .eq("id", event_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data[0]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: str, user: AuthUser = Depends(get_current_user)):
    sb = get_supabase_admin()
    result = (
        sb.table("events")
        .delete()
        .eq("id", event_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
