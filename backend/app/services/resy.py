"""Resy API client for account linking and reservations."""

import httpx

from app.config import get_settings

BASE_URL = "https://api.resy.com"


class ResyClient:
    def __init__(self, auth_token: str | None = None):
        settings = get_settings()
        self._api_key = settings.resy_api_key
        self._auth_token = auth_token

    def _base_headers(self) -> dict:
        return {
            "Authorization": f'ResyAPI api_key="{self._api_key}"',
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://resy.com",
            "Referer": "https://resy.com/",
        }

    def _auth_headers(self) -> dict:
        headers = self._base_headers()
        if self._auth_token:
            headers["x-resy-auth-token"] = self._auth_token
            headers["x-resy-universal-auth"] = self._auth_token
        return headers

    async def login(self, email: str, password: str) -> dict:
        """Authenticate with Resy. Returns auth_token and payment_method_id."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/3/auth/password",
                headers=self._base_headers(),
                data={"email": email, "password": password},
            )
            if resp.status_code in (401, 419):
                raise ValueError("Invalid email or password")
            resp.raise_for_status()

        body = resp.json()
        token = body.get("token", "")
        if not token:
            raise ValueError("No token in Resy login response")

        # Extract first payment method ID
        payment_methods = body.get("payment_methods", [])
        payment_id = ""
        if isinstance(payment_methods, list) and payment_methods:
            payment_id = str(payment_methods[0].get("id", ""))

        return {"auth_token": token, "payment_method_id": payment_id}

    async def verify_token(self) -> bool:
        """Check if the stored auth token is still valid."""
        if not self._auth_token:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{BASE_URL}/2/user", headers=self._auth_headers()
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def search_restaurants(self, query: str) -> list[dict]:
        """Search for restaurants on Resy."""
        import json

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/3/venuesearch/search",
                headers=self._auth_headers(),
                data={"struct_data": json.dumps({"query": query, "per_page": 10, "types": ["venue"]})},
            )
            resp.raise_for_status()

        results = []
        for hit in resp.json().get("search", {}).get("hits", []):
            results.append({
                "platform_id": str(hit.get("id", {}).get("resy", "")),
                "name": hit.get("name", ""),
                "neighborhood": hit.get("neighborhood", ""),
                "cuisine": hit.get("cuisine", [""])[0] if hit.get("cuisine") else "",
            })
        return results

    async def find_slots(self, venue_id: int, date: str, party_size: int) -> list[dict]:
        """Find available reservation slots."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/4/find",
                headers=self._auth_headers(),
                params={"venue_id": venue_id, "day": date, "party_size": party_size, "lat": "0", "long": "0"},
            )
            resp.raise_for_status()

        slots = []
        for venue in resp.json().get("results", {}).get("venues", []):
            for slot in venue.get("slots", []):
                config = slot.get("config", {})
                time_str = slot.get("date", {}).get("start", "")
                if " " in time_str:
                    time_str = time_str.split(" ")[1][:5]
                slots.append({
                    "config_id": str(config.get("id", "")),
                    "token": config.get("token", ""),
                    "time": time_str,
                    "type": config.get("type", ""),
                })
        return slots

    async def book(self, book_token: str, payment_method_id: str) -> dict:
        """Complete a reservation booking."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/3/book",
                headers=self._auth_headers(),
                data={
                    "book_token": book_token,
                    "struct_payment_method": f'{{"id":{payment_method_id}}}',
                    "source_id": "resy.com-venue-details",
                },
            )
            resp.raise_for_status()
        return resp.json()
