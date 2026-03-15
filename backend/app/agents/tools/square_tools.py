"""Square Appointments tools — availability search, booking, and cancellation."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.services.encryption import decrypt
from app.services.supabase import get_supabase_admin

logger = logging.getLogger("calendarai.tools.square")

_NOT_CONNECTED = {
    "error": "Square account not connected. Ask the user to connect Square in Settings first."
}


def _get_access_token(user_id: str) -> str | None:
    """Retrieve the decrypted Square access token for a user."""
    sb = get_supabase_admin()
    profile = (
        sb.table("profiles")
        .select("square_access_token")
        .eq("id", user_id)
        .eq("square_connected", True)
        .single()
        .execute()
    )
    if not profile.data or not profile.data.get("square_access_token"):
        return None
    return decrypt(profile.data["square_access_token"])


@tool_registry.register("search_square_availability", category="appointments")
async def search_square_availability(
    ctx: RunContext[AgentDeps],
    location_id: str,
    start_at: str,
    end_at: str,
    service_variation_id: str,
) -> dict:
    """Search for available appointment slots at a Square merchant.

    Args:
        location_id: Square location ID
        start_at: Start of search window in RFC 3339 format (e.g. 2026-03-16T09:00:00Z)
        end_at: End of search window in RFC 3339 format (e.g. 2026-03-16T17:00:00Z)
        service_variation_id: The catalog object ID for the service variation
    """
    access_token = _get_access_token(ctx.deps.user_id)
    if not access_token:
        return _NOT_CONNECTED

    try:
        from app.services.square import SquareClient

        client = SquareClient(access_token=access_token)
        slots = await client.search_availability(
            location_id=location_id,
            start_at=start_at,
            end_at=end_at,
            service_variation_id=service_variation_id,
        )
        logger.info(
            "search_square_availability location=%s slots=%d", location_id, len(slots)
        )
        return {"availabilities": slots, "count": len(slots)}
    except Exception as e:
        logger.error("search_square_availability error: %s", e)
        return {"error": f"Square API error: {e}"}


@tool_registry.register("book_square_appointment", category="appointments")
async def book_square_appointment(
    ctx: RunContext[AgentDeps],
    location_id: str,
    start_at: str,
    service_variation_id: str,
    customer_id: str = "",
    staff_member_id: str = "",
    customer_note: str = "",
) -> dict:
    """Book an appointment at a Square merchant.

    Args:
        location_id: Square location ID
        start_at: Appointment start in RFC 3339 format (e.g. 2026-03-16T10:00:00Z)
        service_variation_id: The catalog object ID for the service
        customer_id: Square customer ID (optional)
        staff_member_id: Team member ID (optional)
        customer_note: Note from the customer (optional)
    """
    access_token = _get_access_token(ctx.deps.user_id)
    if not access_token:
        return _NOT_CONNECTED

    try:
        from app.services.square import SquareClient

        client = SquareClient(access_token=access_token)
        booking = await client.create_booking(
            location_id=location_id,
            start_at=start_at,
            service_variation_id=service_variation_id,
            customer_id=customer_id,
            staff_member_id=staff_member_id,
            customer_note=customer_note,
        )
        logger.info("book_square_appointment id=%s", booking.get("id"))
        return {
            "booking": booking,
            "message": "Appointment booked successfully. Use create_booking_event to add it to the calendar.",
        }
    except Exception as e:
        logger.error("book_square_appointment error: %s", e)
        return {"error": f"Square booking error: {e}"}


@tool_registry.register("cancel_square_appointment", category="appointments")
async def cancel_square_appointment(
    ctx: RunContext[AgentDeps],
    booking_id: str,
    booking_version: int = 0,
) -> dict:
    """Cancel an existing Square appointment.

    Args:
        booking_id: The Square booking ID to cancel
        booking_version: Current version of the booking for concurrency control (default 0)
    """
    access_token = _get_access_token(ctx.deps.user_id)
    if not access_token:
        return _NOT_CONNECTED

    try:
        from app.services.square import SquareClient

        client = SquareClient(access_token=access_token)
        booking = await client.cancel_booking(
            booking_id=booking_id,
            booking_version=booking_version,
        )
        logger.info("cancel_square_appointment id=%s", booking_id)
        return {"booking": booking, "message": "Appointment cancelled successfully."}
    except Exception as e:
        logger.error("cancel_square_appointment error: %s", e)
        return {"error": f"Square cancellation error: {e}"}
