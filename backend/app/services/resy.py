"""Resy API client for account linking and reservations."""

import re
import logging
import time

import httpx

BASE_URL = "https://api.resy.com"

logger = logging.getLogger("calendarai.resy")

# Module-level cache for the scraped API key
_cached_api_key: str | None = None
_cache_ts: float = 0
_CACHE_TTL = 60 * 60 * 24  # 24 hours


async def _fetch_resy_api_key() -> str:
    """Scrape the public Resy API key from resy.com's JS bundle."""
    global _cached_api_key, _cache_ts
    if _cached_api_key and (time.time() - _cache_ts) < _CACHE_TTL:
        return _cached_api_key

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get("https://resy.com")
        resp.raise_for_status()
        match = re.search(r'src="((?:modules/)?app\.[a-f0-9]+\.js)"', resp.text)
        if not match:
            raise ValueError("Could not find Resy app bundle URL")
        bundle_url = f"https://resy.com/{match.group(1)}"

        resp = await client.get(bundle_url)
        resp.raise_for_status()
        key_match = re.search(r'api[_-]?[Kk]ey\s*[:=]\s*["\']([A-Za-z0-9_-]{20,})["\']', resp.text)
        if not key_match:
            raise ValueError("Could not extract API key from Resy bundle")

        _cached_api_key = key_match.group(1)
        _cache_ts = time.time()
        logger.info("Fetched Resy public API key")
        return _cached_api_key


class ResyClient:
    def __init__(self, auth_token: str | None = None):
        self._api_key: str | None = None
        self._auth_token = auth_token

    async def _ensure_api_key(self) -> str:
        if not self._api_key:
            self._api_key = await _fetch_resy_api_key()
        return self._api_key

    async def _invalidate_api_key(self) -> None:
        """Clear cached API key so the next call fetches a fresh one."""
        global _cached_api_key, _cache_ts
        _cached_api_key = None
        _cache_ts = 0
        self._api_key = None

    async def _base_headers(self) -> dict:
        api_key = await self._ensure_api_key()
        return {
            "Authorization": f'ResyAPI api_key="{api_key}"',
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://resy.com",
            "Referer": "https://resy.com/",
        }

    async def _auth_headers(self) -> dict:
        headers = await self._base_headers()
        if self._auth_token:
            headers["x-resy-auth-token"] = self._auth_token
            headers["x-resy-universal-auth"] = self._auth_token
        return headers

    async def login(self, email: str, password: str) -> dict:
        """Authenticate with Resy. Returns auth_token and payment_method_id."""
        for attempt in range(2):
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{BASE_URL}/3/auth/password",
                    headers=await self._base_headers(),
                    data={"email": email, "password": password},
                )
            if resp.status_code in (401, 419) and attempt == 0:
                logger.warning("Resy auth returned %s, refreshing API key", resp.status_code)
                await self._invalidate_api_key()
                continue
            if resp.status_code in (401, 419):
                raise ValueError("Invalid email or password")
            resp.raise_for_status()
            break

        body = resp.json()
        token = body.get("token", "")
        if not token:
            raise ValueError("No token in Resy login response")

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
                    f"{BASE_URL}/2/user", headers=await self._auth_headers()
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
                headers=await self._auth_headers(),
                data={"struct_data": json.dumps({"query": query, "per_page": 10, "types": ["venue"]})},
            )
            resp.raise_for_status()

        body = resp.json()
        hits = body.get("search", {}).get("hits", [])
        logger.info("search_restaurants query=%r hits=%d", query, len(hits))
        if hits:
            logger.debug("search_restaurants first_hit id=%s name=%s", hits[0].get("id"), hits[0].get("name"))

        results = []
        for hit in hits:
            platform_id = str(hit.get("id", {}).get("resy", ""))
            results.append({
                "platform_id": platform_id,
                "name": hit.get("name", ""),
                "neighborhood": hit.get("neighborhood", ""),
                "cuisine": hit.get("cuisine", [""])[0] if hit.get("cuisine") else "",
            })
        return results

    async def find_slots(self, venue_id: int, date: str, party_size: int) -> list[dict]:
        """Find available reservation slots."""
        logger.info("find_slots venue_id=%s date=%s party_size=%d", venue_id, date, party_size)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/4/find",
                headers=await self._auth_headers(),
                params={"venue_id": venue_id, "day": date, "party_size": party_size, "lat": "0", "long": "0"},
            )
            resp.raise_for_status()

        body = resp.json()
        venues = body.get("results", {}).get("venues", [])
        logger.info("find_slots response venues=%d keys=%s", len(venues), list(body.get("results", {}).keys())[:10])
        if venues:
            first = venues[0]
            logger.debug("find_slots first_venue slots=%d keys=%s", len(first.get("slots", [])), list(first.keys())[:10])

        slots = []
        for venue in venues:
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

    async def get_book_token(self, config_id: str, day: str, party_size: int, token: str | None = None) -> str:
        """Exchange a slot's config token for a book_token via /3/details."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/3/details",
                headers=await self._auth_headers(),
                json={
                    "config_id": token or config_id,
                    "day": day,
                    "party_size": party_size,
                },
            )
            resp.raise_for_status()
        book_token = resp.json().get("book_token", {}).get("value", "")
        if not book_token:
            raise ValueError("No book_token returned from details endpoint")
        return book_token

    async def book(self, book_token: str, payment_method_id: str) -> dict:
        """Complete a reservation booking using a book_token from get_book_token."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/3/book",
                headers=await self._auth_headers(),
                data={
                    "book_token": book_token,
                    "struct_payment_method": f'{{"id":{payment_method_id}}}',
                    "source_id": "resy.com-venue-details",
                },
            )
            resp.raise_for_status()
        return resp.json()
