"""Restaurant discovery tools — web search and details for finding restaurants."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.agents.tools.web_tools import web_search, web_extract

logger = logging.getLogger("calendarai.tools.restaurant")


@tool_registry.register("search_restaurants", category="reservations")
async def search_restaurants(
    ctx: RunContext[AgentDeps],
    query: str,
    location: str = "",
    party_size: int = 2,
) -> dict:
    """Search for restaurants matching a query. Use for discovery when the user
    hasn't named a specific restaurant — e.g. "Italian food near me",
    "best sushi downtown", "restaurants with availability tonight".

    Args:
        query: What the user is looking for (cuisine, vibe, etc.)
        location: Area or neighborhood (uses user's default location if empty)
        party_size: Number of guests (default 2)
    """
    if not location and ctx.deps.user_default_location:
        location = ctx.deps.user_default_location

    search_query = f"{query} restaurants in {location} reservations".strip()
    logger.info("search_restaurants query=%s", search_query[:80])

    results = await web_search(
        ctx,
        query=search_query,
        max_results=8,
        search_depth="advanced",
        include_domains=[
            "resy.com",
            "opentable.com",
            "yelp.com",
            "google.com",
            "eater.com",
            "infatuation.com",
        ],
    )

    restaurants = []
    for r in results.get("results", [])[:8]:
        restaurants.append({
            "name": r.get("title", "").split(" - ")[0].split(" | ")[0].strip(),
            "url": r.get("url", ""),
            "snippet": r.get("content", "")[:300],
            "source": "resy" if "resy.com" in r.get("url", "") else
                      "opentable" if "opentable.com" in r.get("url", "") else "web",
        })

    return {
        "restaurants": restaurants,
        "answer": results.get("answer"),
        "search_query": search_query,
        "tip": "Call find_restaurant with the name of any restaurant to check real-time availability via Resy.",
    }


@tool_registry.register("get_restaurant_details", category="reservations")
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
