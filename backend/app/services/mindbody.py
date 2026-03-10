"""Thin async client for the Mindbody Public API v6."""

import httpx

from app.config import get_settings

BASE_URL = "https://api.mindbodyonline.com/public/v6"


class MindbodyClient:
    def __init__(self):
        settings = get_settings()
        if not settings.mindbody_api_key:
            raise RuntimeError("Mindbody API key not configured")
        self._headers = {
            "Api-Key": settings.mindbody_api_key,
            "SiteId": settings.mindbody_site_id,
            "Content-Type": "application/json",
        }

    async def search_locations(
        self,
        search_text: str = "",
        lat: float | None = None,
        lng: float | None = None,
        radius: int = 10,
    ) -> list[dict]:
        """Search for Mindbody studio locations."""
        params: dict = {"limit": 10}
        if search_text:
            params["searchText"] = search_text
        if lat is not None and lng is not None:
            params["latitude"] = lat
            params["longitude"] = lng
            params["radius"] = radius

        async with httpx.AsyncClient(headers=self._headers, timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/site/locations", params=params)
            resp.raise_for_status()

        locations = resp.json().get("Locations", [])
        return [
            {
                "id": loc.get("Id"),
                "name": loc.get("Name", ""),
                "address": _format_address(loc.get("Address", {})),
                "phone": loc.get("Phone", ""),
                "distance_miles": loc.get("DistanceInMiles"),
            }
            for loc in locations
        ]

    async def get_classes(
        self,
        location_id: int,
        start_date: str,
        end_date: str | None = None,
        class_name: str = "",
    ) -> list[dict]:
        """Get class schedule for a location."""
        params: dict = {
            "locationIds": [location_id],
            "startDateTime": start_date,
            "endDateTime": end_date or start_date,
            "limit": 20,
        }
        if class_name:
            params["classDescriptionIds"] = []  # filter client-side
            params["className"] = class_name

        async with httpx.AsyncClient(headers=self._headers, timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/class/classes", params=params)
            resp.raise_for_status()

        classes = resp.json().get("Classes", [])
        results = []
        for c in classes:
            name = c.get("ClassDescription", {}).get("Name", "")
            if class_name and class_name.lower() not in name.lower():
                continue
            results.append({
                "id": c.get("Id"),
                "name": name,
                "instructor": _format_staff(c.get("Staff", {})),
                "start_time": c.get("StartDateTime", ""),
                "end_time": c.get("EndDateTime", ""),
                "available_spots": c.get("MaxCapacity", 0) - c.get("TotalBooked", 0),
            })
        return results

    async def get_class_descriptions(self, location_id: int) -> list[dict]:
        """Get class type metadata for a location."""
        params = {"locationIds": [location_id], "limit": 50}

        async with httpx.AsyncClient(headers=self._headers, timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/class/classdescriptions", params=params
            )
            resp.raise_for_status()

        descs = resp.json().get("ClassDescriptions", [])
        return [
            {
                "id": d.get("Id"),
                "name": d.get("Name", ""),
                "description": d.get("Description", ""),
                "category": d.get("Category", ""),
                "duration_minutes": d.get("Duration"),
            }
            for d in descs
        ]


def _format_address(addr: dict) -> str:
    parts = [
        addr.get("Address", ""),
        addr.get("City", ""),
        addr.get("State", ""),
        addr.get("PostalCode", ""),
    ]
    return ", ".join(p for p in parts if p)


def _format_staff(staff: dict) -> str:
    first = staff.get("FirstName", "")
    last = staff.get("LastName", "")
    return f"{first} {last}".strip()
