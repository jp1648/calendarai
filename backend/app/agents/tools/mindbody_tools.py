"""Mindbody API tools — fitness/wellness studio search and class booking."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.config import get_settings

logger = logging.getLogger("calendarai.tools.mindbody")

_NOT_CONFIGURED = {
    "error": "Mindbody not configured. Use browser tools to search fitness sites directly."
}


@tool_registry.register("mindbody_search_studios")
async def mindbody_search_studios(
    ctx: RunContext[AgentDeps],
    query: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
    radius_miles: int = 10,
) -> dict:
    """Search for fitness/wellness studios near a location using the Mindbody API.

    Args:
        query: Search text (studio name, class type, etc.)
        latitude: User's latitude (optional, improves results)
        longitude: User's longitude (optional, improves results)
        radius_miles: Search radius in miles (default 10)
    """
    settings = get_settings()
    if not settings.mindbody_api_key:
        return _NOT_CONFIGURED

    try:
        from app.services.mindbody import MindbodyClient

        client = MindbodyClient()
        locations = await client.search_locations(
            search_text=query,
            lat=latitude,
            lng=longitude,
            radius=radius_miles,
        )
        logger.info("mindbody_search_studios query=%s results=%d", query, len(locations))
        return {"studios": locations, "count": len(locations)}
    except Exception as e:
        logger.error("mindbody_search_studios error: %s", e)
        return {"error": f"Mindbody API error: {e}. Try using browser tools instead."}


@tool_registry.register("mindbody_get_classes")
async def mindbody_get_classes(
    ctx: RunContext[AgentDeps],
    location_id: int,
    start_date: str,
    end_date: str = "",
    class_name: str = "",
) -> dict:
    """Get the class schedule for a Mindbody studio.

    Args:
        location_id: Studio location ID (from mindbody_search_studios)
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format (defaults to start_date)
        class_name: Filter by class name (e.g. "yoga", "spin")
    """
    settings = get_settings()
    if not settings.mindbody_api_key:
        return _NOT_CONFIGURED

    try:
        from app.services.mindbody import MindbodyClient

        client = MindbodyClient()
        classes = await client.get_classes(
            location_id=location_id,
            start_date=start_date,
            end_date=end_date or start_date,
            class_name=class_name,
        )
        logger.info(
            "mindbody_get_classes location=%d date=%s results=%d",
            location_id, start_date, len(classes),
        )
        return {"classes": classes, "count": len(classes)}
    except Exception as e:
        logger.error("mindbody_get_classes error: %s", e)
        return {"error": f"Mindbody API error: {e}. Try using browser tools instead."}


@tool_registry.register("mindbody_book_class")
async def mindbody_book_class(
    ctx: RunContext[AgentDeps],
    location_id: int,
    class_id: int,
    studio_name: str = "",
) -> dict:
    """Book a fitness class at a Mindbody studio.

    Note: Full booking via API requires user auth tokens. This returns a direct
    booking URL for the user to complete the reservation.

    Args:
        location_id: Studio location ID
        class_id: Class ID (from mindbody_get_classes)
        studio_name: Studio name for the calendar event title
    """
    settings = get_settings()
    if not settings.mindbody_api_key:
        return _NOT_CONFIGURED

    booking_url = (
        f"https://clients.mindbodyonline.com/classic/ws"
        f"?studioid={settings.mindbody_site_id}"
        f"&stype=-7&sVT={class_id}&sLoc={location_id}"
    )

    logger.info(
        "mindbody_book_class studio=%s class_id=%d", studio_name, class_id
    )

    return {
        "booking_url": booking_url,
        "message": (
            f"Complete your booking for {studio_name or 'this class'} here: {booking_url}\n"
            "After booking, use create_booking_event to add it to the calendar."
        ),
    }
