from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.middleware import AuthUser, get_current_user
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    full_name: str
    phone: str
    timezone: str
    default_location: str
    email: str
    gmail_connected: bool
    resy_connected: bool
    square_connected: bool
    calendly_connected: bool
    eventbrite_connected: bool
    ical_feed_token: str


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    timezone: str | None = None
    default_location: str | None = None


@router.get("", response_model=ProfileResponse)
async def get_profile(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase_admin()
    result = (
        sb.table("profiles")
        .select("full_name, phone, timezone, default_location, email, gmail_connected, resy_connected, square_connected, calendly_connected, eventbrite_connected, ical_feed_token")
        .eq("id", user.id)
        .single()
        .execute()
    )
    return result.data


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user: AuthUser = Depends(get_current_user),
):
    sb = get_supabase_admin()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        sb.table("profiles").update(updates).eq("id", user.id).execute()

    result = (
        sb.table("profiles")
        .select("full_name, phone, timezone, default_location, email, gmail_connected, resy_connected, square_connected, calendly_connected, eventbrite_connected, ical_feed_token")
        .eq("id", user.id)
        .single()
        .execute()
    )
    return result.data
