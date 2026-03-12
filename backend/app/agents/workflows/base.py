"""Base classes for booking workflows.

A workflow encapsulates the full booking flow for a category (restaurant,
fitness, etc.).  Platform-specific logic lives in PlatformAdapter subclasses;
the workflow tool detects the right adapter automatically from web search
results, keeping the decision in code — not in prompts.

Adding a new platform = one PlatformAdapter subclass.
Adding a new category = one workflow file with 2 tools (find + book).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING
from urllib.parse import urlparse

if TYPE_CHECKING:
    from app.agents.deps import AgentDeps


class PlatformAdapter(ABC):
    """Interface for a booking platform (Resy, OpenTable, Mindbody, …)."""

    name: str

    @abstractmethod
    def is_available(self, deps: AgentDeps) -> bool:
        """Whether the user has this platform connected / can use the API."""

    @abstractmethod
    async def search(self, deps: AgentDeps, query: str, location: str = "") -> list[dict]:
        """Search for venues/businesses on this platform."""

    @abstractmethod
    async def find_slots(
        self, deps: AgentDeps, venue_id: str, date: str, party_size: int,
    ) -> list[dict]:
        """Find available booking slots at a venue."""

    @abstractmethod
    async def book(self, deps: AgentDeps, booking_ref: str, date: str = "", party_size: int = 2) -> dict:
        """Complete a booking.  Returns dict with 'success' or 'error' key."""


# Domain substring → platform name.  Checked in order; first match wins.
PLATFORM_DOMAINS: list[tuple[str, str]] = [
    ("resy.com", "resy"),
    ("opentable.com", "opentable"),
]


def detect_platform(search_results: list[dict]) -> tuple[str | None, str | None]:
    """Detect booking platform from web-search result URLs.

    Returns (platform_name, first_matching_url) or (None, None).
    """
    for result in search_results:
        url = result.get("url", "")
        host = urlparse(url).hostname or ""
        for domain, platform in PLATFORM_DOMAINS:
            if domain in host:
                return platform, url
    return None, None
