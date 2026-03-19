"""Restaurant booking workflow.

Flow:
  1. find_restaurant  — web search → detect platform → API slots or browser URL
  2. book_restaurant  — complete booking via API adapter, create calendar event

Platform adapters are selected automatically based on web search results.
The agent never chooses a platform — the code does.
"""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.agents.workflows.base import PlatformAdapter, detect_platform

logger = logging.getLogger("calendarai.workflows.restaurant")


# ---------------------------------------------------------------------------
# Platform adapters
# ---------------------------------------------------------------------------

class ResyAdapter(PlatformAdapter):
    name = "resy"

    def is_available(self, deps: AgentDeps) -> bool:
        return bool(deps.resy_auth_token)

    async def search(self, deps: AgentDeps, query: str, location: str = "") -> list[dict]:
        from app.services.resy import ResyClient

        search_query = f"{query} {location}".strip() if location else query
        client = ResyClient(auth_token=deps.resy_auth_token)
        return await client.search_restaurants(search_query)

    async def find_slots(
        self, deps: AgentDeps, venue_id: str, date: str, party_size: int,
    ) -> list[dict]:
        from app.services.resy import ResyClient

        client = ResyClient(auth_token=deps.resy_auth_token)
        lat = deps.user_latitude or 0
        lng = deps.user_longitude or 0
        return await client.find_slots(int(venue_id), date, party_size, lat=lat, lng=lng)

    async def book(self, deps: AgentDeps, booking_ref: str, date: str = "", party_size: int = 2) -> dict:
        from app.services.encryption import decrypt
        from app.services.resy import ResyClient
        from app.services.supabase import get_supabase_admin

        sb = get_supabase_admin()
        row = (
            sb.table("profiles")
            .select("resy_payment_method_id")
            .eq("id", deps.user_id)
            .single()
            .execute()
        )
        encrypted_id = row.data.get("resy_payment_method_id")
        if not encrypted_id:
            return {"error": "No payment method on your Resy account. Add one in the Resy app."}

        try:
            payment_id = decrypt(encrypted_id)
        except Exception:
            return {"error": "Could not read payment method. Reconnect Resy in Settings."}

        client = ResyClient(auth_token=deps.resy_auth_token)

        # Step 1: Exchange slot token for a book_token via /3/details
        book_token = await client.get_book_token(
            config_id=booking_ref,
            day=date,
            party_size=party_size,
            token=booking_ref,
        )

        # Step 2: Book using the book_token
        confirmation = await client.book(book_token, payment_id)
        return {"success": True, "confirmation": confirmation}


# Adapter registry — add new adapters here.
_ADAPTERS: dict[str, PlatformAdapter] = {
    "resy": ResyAdapter(),
}


def _pick_best_venue(venues: list[dict], name: str, location: str) -> dict:
    """Pick the venue that best matches the name and location.

    Prefers venues whose neighborhood mentions the location (e.g. 'New York',
    'NYC', 'midtown') over venues in other cities.  Falls back to the first
    venue if nothing matches.
    """
    if not location and len(venues) == 1:
        return venues[0]

    name_lower = name.lower()
    loc_lower = location.lower() if location else ""

    # Common aliases for user-supplied locations
    _NYC_HINTS = {"nyc", "new york", "manhattan", "brooklyn", "queens", "midtown", "downtown"}

    def _score(v: dict) -> int:
        score = 0
        v_name = v.get("name", "").lower()
        v_hood = v.get("neighborhood", "").lower()

        # Name match
        if name_lower in v_name:
            score += 10

        # Location / neighborhood match
        if loc_lower:
            if loc_lower in v_hood or loc_lower in v_name:
                score += 20
            # Check NYC aliases
            if any(h in loc_lower for h in _NYC_HINTS):
                if any(h in v_hood for h in _NYC_HINTS) or "ny" in v_hood:
                    score += 20

        # Penalize venues clearly in other countries/cities
        # (neighborhood like "Firenze", "Hong Kong", "London" when user wants NYC)
        if loc_lower and loc_lower not in v_hood and v_hood:
            score -= 5

        return score

    return max(venues, key=_score)


# ---------------------------------------------------------------------------
# Agent tools
# ---------------------------------------------------------------------------

@tool_registry.register("browse_available_restaurants", category="reservations")
async def browse_available_restaurants(
    ctx: RunContext[AgentDeps],
    query: str,
    date: str,
    party_size: int = 2,
    location: str = "",
) -> dict:
    """Browse restaurants with real-time availability on Resy. Use this when the
    user wants to DISCOVER restaurants (no specific name), e.g. "dinner near me
    tonight", "find available reservations", "Italian food tonight".

    Searches Resy directly and checks availability for the top results.

    Args:
        query: What to search for — cuisine, meal type, vibe (e.g. 'dinner', 'Italian', 'sushi')
        date: Date in YYYY-MM-DD format
        party_size: Number of guests (default 2)
        location: Area or city (uses user's default location if empty)
    """
    if not location and ctx.deps.user_default_location:
        location = ctx.deps.user_default_location

    adapter = _ADAPTERS.get("resy")
    if not adapter or not adapter.is_available(ctx.deps):
        return {"error": "Resy is not connected. Ask user to connect in Settings."}

    search_query = f"{query} {location}".strip()
    logger.info("browse_available_restaurants query=%r date=%s party=%d", search_query, date, party_size)

    try:
        venues = await adapter.search(ctx.deps, search_query, location=location)
    except Exception as e:
        logger.error("browse_available_restaurants search failed: %s", e)
        return {"error": f"Resy search failed: {e}"}

    if not venues:
        return {"restaurants": [], "message": "No restaurants found. Try a broader query."}

    # Check availability for top venues
    results = []
    for venue in venues[:6]:
        try:
            slots = await adapter.find_slots(
                ctx.deps, venue.get("platform_id", ""), date, party_size,
            )
            if slots:
                results.append({
                    "name": venue.get("name", ""),
                    "neighborhood": venue.get("neighborhood", ""),
                    "cuisine": venue.get("cuisine", ""),
                    "available_times": [
                        {"time": s.get("time", ""), "type": s.get("type", ""),
                         "booking_ref": f"resy:{s.get('token', '')}"}
                        for s in slots[:8]
                    ],
                    "slot_count": len(slots),
                })
        except Exception as e:
            logger.warning("browse_available_restaurants slots failed for %s: %s", venue.get("name"), e)
            continue

    logger.info("browse_available_restaurants found %d restaurants with availability", len(results))
    return {
        "restaurants": results,
        "message": f"Found {len(results)} restaurants with availability on Resy.",
    }


@tool_registry.register("find_restaurant", category="reservations")
async def find_restaurant(
    ctx: RunContext[AgentDeps],
    name: str,
    date: str,
    party_size: int = 2,
    location: str = "",
    time: str = "",
) -> dict:
    """Search for a restaurant and check how to book it.

    Automatically detects the reservation platform (Resy, OpenTable, etc.)
    and returns available slots when possible.

    Args:
        name: Short restaurant name — use 1-2 words (e.g. 'Vezzo', 'Carbone', not 'Vezzo Thin Crust Pizza NYC')
        date: Date in YYYY-MM-DD format
        party_size: Number of guests (default 2)
        location: Neighborhood or area (e.g. 'midtown east')
        time: Preferred time (e.g. '19:00') — used to filter slots
    """
    from app.agents.tools.web_tools import web_search

    # Use user's default location as fallback
    if not location and ctx.deps.user_default_location:
        location = ctx.deps.user_default_location

    # --- Step 1: Web search to find the restaurant + detect its platform ---
    query = f"{name} restaurant {location} reservation".strip()
    search_data = await web_search(
        ctx,
        query=query,
        max_results=5,
        include_domains=["resy.com", "opentable.com", "yelp.com", "google.com"],
    )
    results = search_data.get("results", [])
    platform, booking_url = detect_platform(results)

    # Build restaurant info from best matching result
    restaurant = {"name": name, "location": location}
    for r in results:
        if name.lower() in r.get("title", "").lower():
            restaurant["snippet"] = r.get("content", "")[:300]
            restaurant["url"] = r.get("url", "")
            break
    if search_data.get("answer"):
        restaurant["search_summary"] = search_data["answer"]

    # --- Step 2: If API adapter exists and user is connected, use it ---
    if platform and platform in _ADAPTERS:
        adapter = _ADAPTERS[platform]
        if adapter.is_available(ctx.deps):
            try:
                venues = await adapter.search(ctx.deps, name, location=location)
                logger.info("find_restaurant search results=%d for query=%r", len(venues), name)
                if venues:
                    venue = _pick_best_venue(venues, name, location)
                    logger.info(
                        "find_restaurant using venue name=%s platform_id=%s neighborhood=%s",
                        venue.get("name"), venue.get("platform_id"), venue.get("neighborhood"),
                    )
                    restaurant.update({
                        "address": venue.get("neighborhood", ""),
                        "cuisine": venue.get("cuisine", ""),
                    })
                    slots = await adapter.find_slots(
                        ctx.deps, venue.get("platform_id", ""), date, party_size,
                    )
                    logger.info(
                        "find_restaurant api=%s venue=%s slots=%d date=%s party=%d",
                        platform, name, len(slots), date, party_size,
                    )
                    return {
                        "restaurant": restaurant,
                        "platform": platform,
                        "booking_method": "api",
                        "slots": [
                            {
                                "time": s.get("time", ""),
                                "type": s.get("type", ""),
                                "booking_ref": f"{platform}:{s.get('token', '')}",
                            }
                            for s in slots
                        ],
                        "slot_count": len(slots),
                    }
            except Exception as e:
                logger.warning(
                    "find_restaurant adapter %s failed, falling back to browser: %s",
                    platform, e,
                )

    # --- Step 3: Fallback — browser-based booking ---
    logger.info("find_restaurant browser fallback platform=%s name=%s", platform, name)
    return {
        "restaurant": restaurant,
        "platform": platform or "unknown",
        "booking_method": "browser",
        "booking_url": booking_url or restaurant.get("url", ""),
        "message": (
            f"Use browser_navigate to go to the booking URL and complete "
            f"the reservation on {platform or 'their website'}."
        ),
    }


@tool_registry.register("book_restaurant", category="reservations")
async def book_restaurant(
    ctx: RunContext[AgentDeps],
    booking_ref: str,
    restaurant_name: str = "",
    date: str = "",
    time: str = "",
    party_size: int = 2,
    address: str = "",
) -> dict:
    """Book a restaurant reservation using a reference from find_restaurant.

    For API-based platforms this completes the booking directly and creates a
    calendar event.  For browser-based platforms, return an error directing the
    agent to use browser tools instead.

    Args:
        booking_ref: Booking reference (e.g. 'resy:book_token_abc')
        restaurant_name: Restaurant name (for the calendar event)
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24h)
        party_size: Number of guests
        address: Restaurant address
    """
    if ":" not in booking_ref:
        return {"error": "Invalid booking_ref. Expected 'platform:token'."}

    platform, token = booking_ref.split(":", 1)

    # Validate platform and token from LLM output
    if platform not in _ADAPTERS:
        logger.warning(
            "book_restaurant invalid platform=%r from booking_ref (known: %s)",
            platform, list(_ADAPTERS.keys()),
        )

    if not token or not token.strip():
        logger.warning("book_restaurant empty token in booking_ref")
        return {"error": "Invalid booking_ref: token is empty."}

    if len(token) > 500:
        logger.warning("book_restaurant token too long len=%d", len(token))
        return {"error": "Invalid booking_ref: token exceeds maximum length."}

    if platform not in _ADAPTERS:
        return {
            "error": f"No API adapter for '{platform}'. Use browser tools to book."
        }

    adapter = _ADAPTERS[platform]
    if not adapter.is_available(ctx.deps):
        return {
            "error": f"{platform.title()} is not connected. Ask user to connect in Settings."
        }

    # --- Book via adapter ---
    try:
        result = await adapter.book(ctx.deps, token, date=date, party_size=party_size)
    except Exception as e:
        logger.error("book_restaurant error: %s", e)
        return {"error": f"Booking failed: {e}. Try browser tools instead."}

    if result.get("error"):
        return result

    # --- Create calendar event ---
    if date and time:
        from datetime import datetime as dt, timedelta
        from app.agents.tools.calendar_tools import create_event

        start_dt = dt.fromisoformat(f"{date}T{time}:00")
        end_dt = start_dt + timedelta(hours=2)
        event = await create_event(
            ctx,
            title=f"Dinner at {restaurant_name} ({party_size} guests)",
            start_time=start_dt.isoformat(),
            end_time=end_dt.isoformat(),
            location=address,
            description=f"Booked via {platform.title()} · Party of {party_size}",
        )
        result["event"] = event

    logger.info("book_restaurant success platform=%s restaurant=%s", platform, restaurant_name)
    result["message"] = f"Reservation booked at {restaurant_name} via {platform.title()}!"
    return result


@tool_registry.register("list_resy_reservations", category="reservations")
async def list_resy_reservations(
    ctx: RunContext[AgentDeps],
) -> dict:
    """List the user's upcoming Resy reservations. Use this to find reservation
    details before cancelling or modifying.

    Returns restaurant name, date, time, party size, and the resy_token needed
    for cancellation.
    """
    adapter = _ADAPTERS.get("resy")
    if not adapter or not adapter.is_available(ctx.deps):
        return {"error": "Resy is not connected. Ask user to connect in Settings."}

    from app.services.resy import ResyClient
    client = ResyClient(auth_token=ctx.deps.resy_auth_token)

    try:
        reservations = await client.list_reservations()
    except Exception as e:
        logger.error("list_resy_reservations failed: %s", e)
        return {"error": f"Failed to fetch reservations: {e}"}

    logger.info("list_resy_reservations found %d upcoming", len(reservations))
    return {"reservations": reservations}


@tool_registry.register("cancel_resy_reservation", category="reservations")
async def cancel_resy_reservation(
    ctx: RunContext[AgentDeps],
    resy_token: str,
    restaurant_name: str = "",
) -> dict:
    """Cancel a Resy reservation. Get the resy_token from list_resy_reservations first.

    Args:
        resy_token: The reservation's resy_token from list_resy_reservations
        restaurant_name: Restaurant name (for confirmation message)
    """
    if not resy_token or not resy_token.strip():
        return {"error": "resy_token is required. Call list_resy_reservations first."}

    adapter = _ADAPTERS.get("resy")
    if not adapter or not adapter.is_available(ctx.deps):
        return {"error": "Resy is not connected. Ask user to connect in Settings."}

    from app.services.resy import ResyClient
    client = ResyClient(auth_token=ctx.deps.resy_auth_token)

    try:
        result = await client.cancel_reservation(resy_token.strip())
    except Exception as e:
        logger.error("cancel_resy_reservation failed: %s", e)
        return {"error": f"Cancellation failed: {e}"}

    logger.info("cancel_resy_reservation success restaurant=%s", restaurant_name)
    return {
        "success": True,
        "message": f"Reservation at {restaurant_name} has been cancelled." if restaurant_name
                   else "Reservation cancelled.",
    }
