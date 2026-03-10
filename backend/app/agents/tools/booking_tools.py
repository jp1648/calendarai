"""Generic booking event tool — works for any booking category."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry

logger = logging.getLogger("calendarai.tools.booking")


@tool_registry.register("create_booking_event")
async def create_booking_event(
    ctx: RunContext[AgentDeps],
    title: str,
    date: str,
    time: str,
    duration_hours: float = 1.0,
    booking_type: str = "",
    business_name: str = "",
    address: str = "",
    phone: str = "",
    booking_url: str = "",
    confirmation_number: str = "",
    notes: str = "",
) -> dict:
    """Create a calendar event for any type of booking (restaurant, doctor, dentist, etc.).

    Args:
        title: Event title
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24h)
        duration_hours: Duration in hours (default 1.0)
        booking_type: Category — restaurant, doctor, dentist, haircut, auto_service, fitness
        business_name: Name of the business/provider
        address: Business address
        phone: Phone number
        booking_url: URL to complete or manage the booking
        confirmation_number: Booking confirmation number if available
        notes: Additional notes (insurance info, service details, etc.)
    """
    from app.agents.tools.calendar_tools import create_event

    start_time = f"{date}T{time}:00"
    # Calculate end time
    hour, minute = int(time.split(":")[0]), int(time.split(":")[1])
    total_minutes = hour * 60 + minute + int(duration_hours * 60)
    end_hour = total_minutes // 60
    end_minute = total_minutes % 60
    end_time = f"{date}T{end_hour:02d}:{end_minute:02d}:00"

    # Build description from booking metadata
    description_parts = []
    if booking_type:
        description_parts.append(f"Type: {booking_type}")
    if phone:
        description_parts.append(f"Phone: {phone}")
    if booking_url:
        description_parts.append(f"Book/Manage: {booking_url}")
    if confirmation_number:
        description_parts.append(f"Confirmation: {confirmation_number}")
    if notes:
        description_parts.append(f"Notes: {notes}")
    description = "\n".join(description_parts)

    result = await create_event(
        ctx,
        title=title,
        start_time=start_time,
        end_time=end_time,
        description=description,
        location=address,
    )

    logger.info(
        "create_booking_event type=%s business=%s date=%s time=%s",
        booking_type, business_name, date, time,
    )

    return {
        **result,
        "booking_url": booking_url,
        "message": f"Booking event created: {title}."
        + (f" Complete your booking: {booking_url}" if booking_url else ""),
    }
