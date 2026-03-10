"""Restaurant search, details, and reservation tools."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.agents.tools.web_tools import web_search, web_extract

logger = logging.getLogger("calendarai.tools.restaurant")


@tool_registry.register("search_restaurants")
async def search_restaurants(
    ctx: RunContext[AgentDeps],
    cuisine: str,
    location: str,
    date: str,
    time: str,
    party_size: int = 2,
) -> dict:
    """Search for restaurant options.

    Args:
        cuisine: Type of cuisine (e.g. 'mexican', 'italian', 'sushi')
        location: Area or neighborhood (e.g. 'lower east side', 'midtown')
        date: Date in YYYY-MM-DD format
        time: Preferred time (e.g. '7pm', '19:00')
        party_size: Number of guests (default 2)
    """
    query = (
        f"best {cuisine} restaurants in {location} "
        f"open for dinner reservations party of {party_size}"
    )
    logger.info("search_restaurants query=%s", query[:80])

    results = await web_search(
        ctx,
        query=query,
        max_results=5,
        search_depth="advanced",
        include_domains=[
            "opentable.com",
            "resy.com",
            "yelp.com",
            "google.com",
        ],
    )

    # Structure results for the agent
    restaurants = []
    for r in results.get("results", [])[:5]:
        restaurants.append({
            "name": r.get("title", "").split(" - ")[0].strip(),
            "url": r.get("url", ""),
            "snippet": r.get("content", "")[:300],
        })

    return {
        "restaurants": restaurants,
        "answer": results.get("answer"),
        "search_query": query,
    }


@tool_registry.register("get_restaurant_details")
async def get_restaurant_details(
    ctx: RunContext[AgentDeps],
    url: str,
) -> dict:
    """Get detailed info about a restaurant from its page.

    Args:
        url: The restaurant's URL (from search results)
    """
    logger.info("get_restaurant_details url=%s", url[:80])
    pages = await web_extract(ctx, urls=[url])

    if not pages:
        return {"error": "Could not extract page content"}

    content = pages[0].get("content", "")
    return {
        "url": url,
        "content": content[:3000],
    }


@tool_registry.register("create_reservation_event")
async def create_reservation_event(
    ctx: RunContext[AgentDeps],
    restaurant_name: str,
    date: str,
    time: str,
    party_size: int,
    booking_url: str = "",
    address: str = "",
) -> dict:
    """Create a calendar event for a restaurant reservation.

    Args:
        restaurant_name: Name of the restaurant
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24h)
        party_size: Number of guests
        booking_url: URL to complete the reservation
        address: Restaurant address
    """
    from app.agents.tools.calendar_tools import create_event

    title = f"Dinner at {restaurant_name} ({party_size} guests)"
    start_time = f"{date}T{time}:00"
    # Default 2 hour dinner
    hour = int(time.split(":")[0])
    end_hour = hour + 2
    end_time = f"{date}T{end_hour:02d}:{time.split(':')[1]}:00"

    description_parts = []
    if booking_url:
        description_parts.append(f"Book: {booking_url}")
    description_parts.append(f"Party size: {party_size}")
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
        "create_reservation_event restaurant=%s date=%s time=%s",
        restaurant_name, date, time,
    )

    return {
        **result,
        "booking_url": booking_url,
        "message": f"Reservation event created for {restaurant_name}. "
        + ("Complete your booking here: " + booking_url if booking_url else ""),
    }
