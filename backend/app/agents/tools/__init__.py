# Import all tool modules to trigger registration with the tool_registry.
# Order: meta/discovery first, then individual tools, then workflows.
from app.agents.tools import discover_tools  # noqa: F401 — categories + meta-tool
from app.agents.tools import calendar_tools, time_tools, gmail_tools, web_tools, browse_tools, restaurant_tools, browser_tools, booking_tools, social_tools, mindbody_tools, calendly_tools  # noqa: F401
from app.agents import workflows  # noqa: F401 — workflow tools (restaurant, etc.)
