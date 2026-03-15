"""Square Appointments API client for OAuth, availability search, and bookings."""

import logging
from urllib.parse import urlencode

import httpx

from app.config import get_settings

BASE_URL = "https://connect.squareup.com"

logger = logging.getLogger("calendarai.square")


class SquareClient:
    def __init__(self, access_token: str | None = None):
        self._access_token = access_token

    def _headers(self) -> dict:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-18",
        }
        if self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"
        return headers

    # ── OAuth ────────────────────────────────────────────────────────────

    @staticmethod
    def get_auth_url(state: str) -> str:
        """Build the Square OAuth authorization URL."""
        settings = get_settings()
        params = {
            "client_id": settings.square_app_id,
            "scope": "APPOINTMENTS_READ APPOINTMENTS_WRITE MERCHANT_PROFILE_READ",
            "session": "false",
            "state": state,
        }
        return f"{BASE_URL}/oauth2/authorize?{urlencode(params)}"

    @staticmethod
    async def exchange_code(code: str) -> dict:
        """Exchange an authorization code for access + refresh tokens."""
        settings = get_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/oauth2/token",
                json={
                    "client_id": settings.square_app_id,
                    "client_secret": settings.square_app_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
        body = resp.json()
        return {
            "access_token": body["access_token"],
            "refresh_token": body.get("refresh_token", ""),
            "expires_at": body.get("expires_at", ""),
            "merchant_id": body.get("merchant_id", ""),
        }

    @staticmethod
    async def refresh_access_token(refresh_token: str) -> dict:
        """Refresh an expired access token."""
        settings = get_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/oauth2/token",
                json={
                    "client_id": settings.square_app_id,
                    "client_secret": settings.square_app_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
        body = resp.json()
        return {
            "access_token": body["access_token"],
            "refresh_token": body.get("refresh_token", refresh_token),
            "expires_at": body.get("expires_at", ""),
        }

    # ── Locations ────────────────────────────────────────────────────────

    async def list_locations(self) -> list[dict]:
        """List merchant locations."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/v2/locations",
                headers=self._headers(),
            )
            resp.raise_for_status()
        locations = resp.json().get("locations", [])
        logger.info("list_locations count=%d", len(locations))
        return [
            {
                "id": loc["id"],
                "name": loc.get("name", ""),
                "address": loc.get("address", {}),
                "timezone": loc.get("timezone", ""),
            }
            for loc in locations
        ]

    # ── Availability ─────────────────────────────────────────────────────

    async def search_availability(
        self,
        location_id: str,
        start_at: str,
        end_at: str,
        service_variation_id: str,
    ) -> list[dict]:
        """Search for available appointment slots.

        Args:
            location_id: Square location ID
            start_at: RFC 3339 start time
            end_at: RFC 3339 end time
            service_variation_id: The catalog object ID for the service variation
        """
        body = {
            "query": {
                "filter": {
                    "location_id": location_id,
                    "start_at_range": {
                        "start_at": start_at,
                        "end_at": end_at,
                    },
                    "segment_filters": [
                        {"service_variation_id": service_variation_id}
                    ],
                }
            }
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/bookings/availability/search",
                headers=self._headers(),
                json=body,
            )
            resp.raise_for_status()

        availabilities = resp.json().get("availabilities", [])
        logger.info(
            "search_availability location=%s slots=%d", location_id, len(availabilities)
        )
        return [
            {
                "start_at": slot.get("start_at", ""),
                "location_id": slot.get("location_id", ""),
                "appointment_segments": slot.get("appointment_segments", []),
            }
            for slot in availabilities
        ]

    # ── Bookings ─────────────────────────────────────────────────────────

    async def create_booking(
        self,
        location_id: str,
        start_at: str,
        service_variation_id: str,
        customer_id: str = "",
        staff_member_id: str = "",
        customer_note: str = "",
    ) -> dict:
        """Create a new appointment booking.

        Args:
            location_id: Square location ID
            start_at: RFC 3339 start time for the appointment
            service_variation_id: Catalog object ID for the service
            customer_id: Square customer ID (optional)
            staff_member_id: Team member ID (optional)
            customer_note: Note from the customer (optional)
        """
        appointment_segment = {
            "service_variation_id": service_variation_id,
            "service_variation_version": 0,
        }
        if staff_member_id:
            appointment_segment["team_member_id"] = staff_member_id

        booking_data: dict = {
            "location_id": location_id,
            "start_at": start_at,
            "appointment_segments": [appointment_segment],
        }
        if customer_id:
            booking_data["customer_id"] = customer_id
        if customer_note:
            booking_data["customer_note"] = customer_note

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/bookings",
                headers=self._headers(),
                json={"booking": booking_data},
            )
            resp.raise_for_status()

        booking = resp.json().get("booking", {})
        logger.info("create_booking id=%s", booking.get("id"))
        return booking

    async def cancel_booking(self, booking_id: str, booking_version: int = 0) -> dict:
        """Cancel an existing booking.

        Args:
            booking_id: The booking ID to cancel
            booking_version: Current version of the booking (for optimistic concurrency)
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/bookings/{booking_id}/cancel",
                headers=self._headers(),
                json={"booking_version": booking_version},
            )
            resp.raise_for_status()

        booking = resp.json().get("booking", {})
        logger.info("cancel_booking id=%s status=%s", booking_id, booking.get("status"))
        return booking
