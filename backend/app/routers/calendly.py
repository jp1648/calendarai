import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.auth.middleware import AuthUser, get_current_user
from app.config import get_settings
from app.services.calendly import CalendlyClient
from app.services.encryption import encrypt, decrypt
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/calendly", tags=["calendly"])
logger = logging.getLogger("calendarai.calendly.router")


def _get_calendly_tokens(user_id: str) -> tuple[str, str]:
    """Fetch and decrypt Calendly tokens for a user. Returns (access_token, refresh_token)."""
    sb = get_supabase_admin()
    row = (
        sb.table("profiles")
        .select("calendly_access_token, calendly_refresh_token")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not row.data or not row.data.get("calendly_access_token"):
        raise HTTPException(status_code=400, detail="Calendly not connected")
    return (
        decrypt(row.data["calendly_access_token"]),
        decrypt(row.data["calendly_refresh_token"]),
    )


async def _get_client(user_id: str) -> CalendlyClient:
    """Build an authenticated CalendlyClient, refreshing the token if needed."""
    access_token, refresh_token = _get_calendly_tokens(user_id)
    client = CalendlyClient(access_token)
    try:
        await client.get_current_user()
        return client
    except Exception:
        # Token may be expired — try refreshing
        logger.info("Refreshing Calendly token for user %s", user_id)
        try:
            tokens = await CalendlyClient.refresh_access_token(refresh_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Calendly token expired. Please re-link.")
        sb = get_supabase_admin()
        sb.table("profiles").update({
            "calendly_access_token": encrypt(tokens["access_token"]),
            "calendly_refresh_token": encrypt(tokens["refresh_token"]),
        }).eq("id", user_id).execute()
        return CalendlyClient(tokens["access_token"])


@router.get("/auth-url")
async def get_auth_url(user: AuthUser = Depends(get_current_user)):
    """Return the Calendly OAuth authorization URL."""
    url = CalendlyClient.get_auth_url(state=user.id)
    return {"url": url}


@router.get("/callback")
async def oauth_callback(code: str, state: str):
    """Handle Calendly OAuth callback — exchange code for tokens and store them."""
    settings = get_settings()
    user_id = state

    try:
        tokens = await CalendlyClient.exchange_code(code)
    except Exception as e:
        logger.error("Calendly token exchange failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to exchange Calendly authorization code")

    # Fetch user URI for later API calls
    client = CalendlyClient(tokens["access_token"])
    user_resource = await client.get_current_user()
    user_uri = user_resource.get("uri", "")

    sb = get_supabase_admin()
    sb.table("profiles").update({
        "calendly_connected": True,
        "calendly_access_token": encrypt(tokens["access_token"]),
        "calendly_refresh_token": encrypt(tokens["refresh_token"]),
        "calendly_user_uri": user_uri,
    }).eq("id", user_id).execute()

    return RedirectResponse(url=settings.frontend_url + "/settings")


@router.post("/unlink")
async def calendly_unlink(user: AuthUser = Depends(get_current_user)):
    """Disconnect Calendly account."""
    sb = get_supabase_admin()
    sb.table("profiles").update({
        "calendly_connected": False,
        "calendly_access_token": None,
        "calendly_refresh_token": None,
        "calendly_user_uri": None,
    }).eq("id", user.id).execute()
    return {"status": "unlinked"}


@router.get("/event-types")
async def list_event_types(user: AuthUser = Depends(get_current_user)):
    """List the user's Calendly event types."""
    sb = get_supabase_admin()
    row = sb.table("profiles").select("calendly_user_uri").eq("id", user.id).single().execute()
    user_uri = row.data.get("calendly_user_uri") if row.data else None
    if not user_uri:
        raise HTTPException(status_code=400, detail="Calendly not connected")

    client = await _get_client(user.id)
    event_types = await client.list_event_types(user_uri)
    return {"event_types": event_types}


@router.get("/events")
async def list_events(
    user: AuthUser = Depends(get_current_user),
    min_start_time: str | None = Query(None, description="ISO 8601 min start time"),
    max_start_time: str | None = Query(None, description="ISO 8601 max start time"),
):
    """List scheduled Calendly events within a date range."""
    sb = get_supabase_admin()
    row = sb.table("profiles").select("calendly_user_uri").eq("id", user.id).single().execute()
    user_uri = row.data.get("calendly_user_uri") if row.data else None
    if not user_uri:
        raise HTTPException(status_code=400, detail="Calendly not connected")

    client = await _get_client(user.id)
    events = await client.list_scheduled_events(user_uri, min_start_time, max_start_time)
    return {"events": events}


@router.get("/events/{event_uuid}/invitees")
async def get_event_invitees(
    event_uuid: str,
    user: AuthUser = Depends(get_current_user),
):
    """Get invitees for a specific scheduled event."""
    client = await _get_client(user.id)
    invitees = await client.get_event_invitees(event_uuid)
    return {"invitees": invitees}
