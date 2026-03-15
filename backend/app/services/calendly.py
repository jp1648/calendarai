"""Calendly API v2 client for OAuth linking and scheduled events."""

import logging
from datetime import datetime

import httpx

from app.config import get_settings

BASE_URL = "https://api.calendly.com"
AUTH_URL = "https://auth.calendly.com/oauth/authorize"
TOKEN_URL = "https://auth.calendly.com/oauth/token"

logger = logging.getLogger("calendarai.calendly")


class CalendlyClient:
    def __init__(self, access_token: str | None = None):
        self._access_token = access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def get_auth_url(state: str) -> str:
        """Build the Calendly OAuth authorization URL."""
        settings = get_settings()
        params = {
            "client_id": settings.calendly_client_id,
            "redirect_uri": settings.calendly_redirect_uri,
            "response_type": "code",
            "state": state,
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{AUTH_URL}?{qs}"

    @staticmethod
    async def exchange_code(code: str) -> dict:
        """Exchange an authorization code for access + refresh tokens."""
        settings = get_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.calendly_redirect_uri,
                    "client_id": settings.calendly_client_id,
                    "client_secret": settings.calendly_client_secret,
                },
            )
            resp.raise_for_status()
        return resp.json()

    @staticmethod
    async def refresh_access_token(refresh_token: str) -> dict:
        """Refresh an expired access token."""
        settings = get_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.calendly_client_id,
                    "client_secret": settings.calendly_client_secret,
                },
            )
            resp.raise_for_status()
        return resp.json()

    async def get_current_user(self) -> dict:
        """GET /users/me — returns the authenticated user's resource."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/users/me", headers=self._headers())
            resp.raise_for_status()
        return resp.json().get("resource", {})

    async def list_event_types(self, user_uri: str) -> list[dict]:
        """List event types for the given user URI."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/event_types",
                headers=self._headers(),
                params={"user": user_uri},
            )
            resp.raise_for_status()
        return resp.json().get("collection", [])

    async def list_scheduled_events(
        self,
        user_uri: str,
        min_start_time: str | None = None,
        max_start_time: str | None = None,
    ) -> list[dict]:
        """List scheduled events for the given user URI within a date range."""
        params: dict[str, str] = {"user": user_uri}
        if min_start_time:
            params["min_start_time"] = min_start_time
        if max_start_time:
            params["max_start_time"] = max_start_time

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/scheduled_events",
                headers=self._headers(),
                params=params,
            )
            resp.raise_for_status()
        return resp.json().get("collection", [])

    async def get_event_invitees(self, event_uuid: str) -> list[dict]:
        """Get invitees for a scheduled event."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/scheduled_events/{event_uuid}/invitees",
                headers=self._headers(),
            )
            resp.raise_for_status()
        return resp.json().get("collection", [])

    async def cancel_event(self, event_uuid: str, reason: str = "") -> dict:
        """Cancel a scheduled event."""
        body: dict = {}
        if reason:
            body["reason"] = reason
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/scheduled_events/{event_uuid}/cancellation",
                headers=self._headers(),
                json=body,
            )
            resp.raise_for_status()
        return resp.json()
