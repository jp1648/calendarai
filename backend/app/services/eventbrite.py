"""Eventbrite API client for event discovery and user orders."""

import logging
from datetime import datetime

import httpx

from app.config import get_settings

BASE_URL = "https://www.eventbriteapi.com/v3"
OAUTH_AUTHORIZE_URL = "https://www.eventbrite.com/oauth/authorize"
OAUTH_TOKEN_URL = "https://www.eventbrite.com/oauth/token"

logger = logging.getLogger("calendarai.eventbrite")


class EventbriteClient:
    """Eventbrite API client.

    For public search endpoints, only an API key (private token) is needed.
    For user-specific endpoints (orders), an OAuth access token is required.
    """

    def __init__(self, access_token: str | None = None):
        self._api_key = get_settings().eventbrite_api_key
        self._access_token = access_token

    @property
    def _token(self) -> str:
        """Return the best available token — OAuth token if present, else API key."""
        return self._access_token or self._api_key

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
        }

    async def search_events(
        self,
        query: str = "",
        latitude: float | None = None,
        longitude: float | None = None,
        radius: str = "25mi",
        start_date: str | None = None,
        end_date: str | None = None,
        page: int = 1,
    ) -> dict:
        """Search public events on Eventbrite.

        Args:
            query: Search keywords.
            latitude: Location latitude.
            longitude: Location longitude.
            radius: Search radius (e.g. "25mi", "10km").
            start_date: ISO 8601 datetime for range start.
            end_date: ISO 8601 datetime for range end.
            page: Page number for pagination.
        """
        params: dict = {}
        if query:
            params["q"] = query
        if latitude is not None and longitude is not None:
            params["location.latitude"] = str(latitude)
            params["location.longitude"] = str(longitude)
            params["location.within"] = radius
        if start_date:
            params["start_date.range_start"] = start_date
        if end_date:
            params["start_date.range_end"] = end_date
        params["page"] = str(page)
        params["expand"] = "venue"

        logger.info("search_events query=%r lat=%s lng=%s radius=%s", query, latitude, longitude, radius)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/events/search",
                headers=self._headers(),
                params=params,
            )
            resp.raise_for_status()

        body = resp.json()
        events = []
        for ev in body.get("events", []):
            events.append(_parse_event(ev))

        return {
            "events": events,
            "pagination": body.get("pagination", {}),
        }

    async def get_event(self, event_id: str) -> dict:
        """Get full details for a single event.

        Args:
            event_id: Eventbrite event ID.
        """
        logger.info("get_event id=%s", event_id)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/events/{event_id}/",
                headers=self._headers(),
                params={"expand": "venue,ticket_availability"},
            )
            resp.raise_for_status()

        return _parse_event_detail(resp.json())

    async def get_user_orders(self) -> list[dict]:
        """Get the authenticated user's orders (requires OAuth token).

        Returns a list of orders with event info.
        """
        if not self._access_token:
            raise ValueError("OAuth access token required for user orders")

        logger.info("get_user_orders")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/users/me/orders",
                headers=self._headers(),
                params={"expand": "event"},
            )
            resp.raise_for_status()

        body = resp.json()
        orders = []
        for order in body.get("orders", []):
            event = order.get("event", {})
            orders.append({
                "order_id": order.get("id", ""),
                "status": order.get("status", ""),
                "event_id": event.get("id", ""),
                "event_name": event.get("name", {}).get("text", ""),
                "event_start": event.get("start", {}).get("utc", ""),
                "event_end": event.get("end", {}).get("utc", ""),
                "cost": order.get("costs", {}).get("gross", {}).get("display", ""),
            })
        return orders


async def exchange_oauth_code(code: str) -> dict:
    """Exchange an OAuth authorization code for an access token.

    Returns dict with 'access_token' and 'token_type'.
    """
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            OAUTH_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "client_id": settings.eventbrite_client_id,
                "client_secret": settings.eventbrite_client_secret,
                "code": code,
                "redirect_uri": settings.eventbrite_redirect_uri,
            },
        )
        resp.raise_for_status()
    return resp.json()


def get_oauth_authorize_url(user_id: str) -> str:
    """Build the Eventbrite OAuth authorization URL."""
    settings = get_settings()
    return (
        f"{OAUTH_AUTHORIZE_URL}"
        f"?response_type=code"
        f"&client_id={settings.eventbrite_client_id}"
        f"&redirect_uri={settings.eventbrite_redirect_uri}"
        f"&state={user_id}"
    )


def _parse_event(ev: dict) -> dict:
    """Parse an event from search results into a clean dict."""
    venue = ev.get("venue") or {}
    address = venue.get("address", {})
    return {
        "id": ev.get("id", ""),
        "name": (ev.get("name") or {}).get("text", ""),
        "description": (ev.get("description") or {}).get("text", "")[:500],
        "url": ev.get("url", ""),
        "start": (ev.get("start") or {}).get("utc", ""),
        "end": (ev.get("end") or {}).get("utc", ""),
        "start_local": (ev.get("start") or {}).get("local", ""),
        "end_local": (ev.get("end") or {}).get("local", ""),
        "venue": {
            "name": venue.get("name", ""),
            "address": address.get("localized_address_display", ""),
            "city": address.get("city", ""),
            "latitude": address.get("latitude", ""),
            "longitude": address.get("longitude", ""),
        } if venue else None,
        "is_free": ev.get("is_free", False),
        "status": ev.get("status", ""),
        "logo_url": (ev.get("logo") or {}).get("url", ""),
    }


def _parse_event_detail(ev: dict) -> dict:
    """Parse full event details including ticket availability."""
    base = _parse_event(ev)
    ticket_availability = ev.get("ticket_availability") or {}
    base["ticket_availability"] = {
        "has_available_tickets": ticket_availability.get("has_available_tickets", False),
        "minimum_ticket_price": (ticket_availability.get("minimum_ticket_price") or {}).get("display", ""),
        "maximum_ticket_price": (ticket_availability.get("maximum_ticket_price") or {}).get("display", ""),
        "is_sold_out": ticket_availability.get("is_sold_out", False),
    }
    base["capacity"] = ev.get("capacity")
    base["online_event"] = ev.get("online_event", False)
    return base
