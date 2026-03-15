from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.auth.middleware import AuthUser, get_current_user
from app.config import get_settings
from app.services.encryption import encrypt, decrypt
from app.services.square import SquareClient
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/square", tags=["square"])


def _get_square_client(profile: dict) -> SquareClient:
    """Build a SquareClient from a user profile's encrypted token."""
    token_enc = profile.get("square_access_token")
    if not token_enc:
        raise HTTPException(status_code=400, detail="Square account not connected")
    return SquareClient(access_token=decrypt(token_enc))


# ── OAuth ────────────────────────────────────────────────────────────────

@router.get("/auth-url")
async def get_auth_url(user: AuthUser = Depends(get_current_user)):
    """Return the Square OAuth authorization URL."""
    url = SquareClient.get_auth_url(state=user.id)
    return {"url": url}


@router.get("/callback")
async def oauth_callback(code: str, state: str):
    """Handle OAuth callback — exchange code for tokens and store them."""
    settings = get_settings()
    sb = get_supabase_admin()

    try:
        tokens = await SquareClient.exchange_code(code)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to exchange Square authorization code")

    sb.table("profiles").update({
        "square_connected": True,
        "square_access_token": encrypt(tokens["access_token"]),
        "square_refresh_token": encrypt(tokens["refresh_token"]) if tokens["refresh_token"] else None,
        "square_merchant_id": tokens.get("merchant_id", ""),
    }).eq("id", state).execute()

    return RedirectResponse(url=settings.frontend_url + "/settings", status_code=303)


@router.post("/unlink")
async def square_unlink(user: AuthUser = Depends(get_current_user)):
    """Disconnect Square account."""
    sb = get_supabase_admin()
    sb.table("profiles").update({
        "square_connected": False,
        "square_access_token": None,
        "square_refresh_token": None,
        "square_merchant_id": None,
    }).eq("id", user.id).execute()
    return {"status": "unlinked"}


# ── Locations ────────────────────────────────────────────────────────────

@router.get("/locations")
async def list_locations(user: AuthUser = Depends(get_current_user)):
    """List merchant locations for the connected Square account."""
    sb = get_supabase_admin()
    profile = sb.table("profiles").select(
        "square_access_token"
    ).eq("id", user.id).single().execute()

    client = _get_square_client(profile.data)
    try:
        locations = await client.list_locations()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch Square locations")
    return {"locations": locations}


# ── Availability ─────────────────────────────────────────────────────────

@router.get("/availability")
async def search_availability(
    location_id: str = Query(...),
    start: str = Query(..., description="RFC 3339 start time"),
    end: str = Query(..., description="RFC 3339 end time"),
    service_variation_id: str = Query(...),
    user: AuthUser = Depends(get_current_user),
):
    """Search available appointment slots."""
    sb = get_supabase_admin()
    profile = sb.table("profiles").select(
        "square_access_token"
    ).eq("id", user.id).single().execute()

    client = _get_square_client(profile.data)
    try:
        slots = await client.search_availability(
            location_id=location_id,
            start_at=start,
            end_at=end,
            service_variation_id=service_variation_id,
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to search Square availability")
    return {"availabilities": slots}


# ── Booking ──────────────────────────────────────────────────────────────

@router.post("/book")
async def book_appointment(
    data: dict,
    user: AuthUser = Depends(get_current_user),
):
    """Create a new Square appointment booking.

    Body fields: location_id, start_at, service_variation_id,
    customer_id (optional), staff_member_id (optional), customer_note (optional)
    """
    sb = get_supabase_admin()
    profile = sb.table("profiles").select(
        "square_access_token"
    ).eq("id", user.id).single().execute()

    client = _get_square_client(profile.data)
    try:
        booking = await client.create_booking(
            location_id=data["location_id"],
            start_at=data["start_at"],
            service_variation_id=data["service_variation_id"],
            customer_id=data.get("customer_id", ""),
            staff_member_id=data.get("staff_member_id", ""),
            customer_note=data.get("customer_note", ""),
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required field: {e}")
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to create Square booking")
    return {"booking": booking}


# ── Cancel ───────────────────────────────────────────────────────────────

@router.post("/cancel")
async def cancel_booking(
    data: dict,
    user: AuthUser = Depends(get_current_user),
):
    """Cancel a Square appointment booking.

    Body fields: booking_id, booking_version (optional, default 0)
    """
    sb = get_supabase_admin()
    profile = sb.table("profiles").select(
        "square_access_token"
    ).eq("id", user.id).single().execute()

    client = _get_square_client(profile.data)
    booking_id = data.get("booking_id")
    if not booking_id:
        raise HTTPException(status_code=400, detail="booking_id is required")

    try:
        booking = await client.cancel_booking(
            booking_id=booking_id,
            booking_version=data.get("booking_version", 0),
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to cancel Square booking")
    return {"booking": booking}
