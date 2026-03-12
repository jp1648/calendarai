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

    async def search(self, deps: AgentDeps, query: str) -> list[dict]:
        from app.services.resy import ResyClient

        client = ResyClient(auth_token=deps.resy_auth_token)
        return await client.search_restaurants(query)

    async def find_slots(
        self, deps: AgentDeps, venue_id: str, date: str, party_size: int,
    ) -> list[dict]:
        from app.services.resy import ResyClient

        client = ResyClient(auth_token=deps.resy_auth_token)
        return await client.find_slots(int(venue_id), date, party_size)

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


# ---------------------------------------------------------------------------
# Agent tools (2 tools — all the agent ever needs for restaurants)
# ---------------------------------------------------------------------------

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
                venues = await adapter.search(ctx.deps, name)
                if venues:
                    venue = venues[0]
                    restaurant.update({
                        "address": venue.get("neighborhood", ""),
                        "cuisine": venue.get("cuisine", ""),
                    })
                    slots = await adapter.find_slots(
                        ctx.deps, venue.get("platform_id", ""), date, party_size,
                    )
                    logger.info(
                        "find_restaurant api=%s venue=%s slots=%d",
                        platform, name, len(slots),
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
        from app.agents.tools.calendar_tools import create_event

        hour = int(time.split(":")[0])
        end_hour = hour + 2
        event = await create_event(
            ctx,
            title=f"Dinner at {restaurant_name} ({party_size} guests)",
            start_time=f"{date}T{time}:00",
            end_time=f"{date}T{end_hour:02d}:{time.split(':')[1]}:00",
            location=address,
            description=f"Booked via {platform.title()} · Party of {party_size}",
        )
        result["event"] = event

    logger.info("book_restaurant success platform=%s restaurant=%s", platform, restaurant_name)
    result["message"] = f"Reservation booked at {restaurant_name} via {platform.title()}!"
    return result
