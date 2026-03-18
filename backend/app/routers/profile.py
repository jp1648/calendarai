from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

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
    ical_feed_token: str
    onboarding_completed: bool


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20, pattern=r"^(\+?\d[\d\s\-().]{0,18})?$")
    timezone: str | None = Field(None, max_length=50)
    default_location: str | None = Field(None, max_length=200)
    onboarding_completed: bool | None = None


@router.get("", response_model=ProfileResponse)
async def get_profile(user: AuthUser = Depends(get_current_user)):
    sb = get_supabase_admin()
    result = (
        sb.table("profiles")
        .select("full_name, phone, timezone, default_location, email, gmail_connected, resy_connected, ical_feed_token, onboarding_completed")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Account not found")
    return result.data


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user: AuthUser = Depends(get_current_user),
):
    sb = get_supabase_admin()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "timezone" in updates:
        try:
            ZoneInfo(updates["timezone"])
        except (ZoneInfoNotFoundError, KeyError):
            raise HTTPException(status_code=422, detail="Invalid timezone")
    if updates:
        sb.table("profiles").update(updates).eq("id", user.id).execute()

    result = (
        sb.table("profiles")
        .select("full_name, phone, timezone, default_location, email, gmail_connected, resy_connected, ical_feed_token, onboarding_completed")
        .eq("id", user.id)
        .single()
        .execute()
    )
    return result.data
