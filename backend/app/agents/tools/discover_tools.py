"""Meta-tool for dynamic tool discovery.

Instead of stuffing tool-routing instructions into the system prompt,
the agent calls discover_tools when it needs to find the right tool
for a task.  This keeps the system prompt lean and the tool selection
driven by the LLM's reasoning, not brittle prompt engineering.
"""

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry

# ---------------------------------------------------------------------------
# Category definitions — describe what each group of tools is for.
# The LLM reads these to decide which category to explore.
# ---------------------------------------------------------------------------

tool_registry.define_category(
    "calendar",
    "Create, read, and check conflicts for calendar events.",
)
tool_registry.define_category(
    "time",
    "Get current time and parse natural language dates.",
)
tool_registry.define_category(
    "search",
    "Search the web and extract content from URLs.",
)
tool_registry.define_category(
    "reservations",
    "Find restaurants and book reservations. Handles platform detection "
    "(Resy, OpenTable, etc.) automatically.",
)
tool_registry.define_category(
    "fitness",
    "Search fitness studios and book classes via Mindbody.",
)
tool_registry.define_category(
    "browser",
    "Automate a real browser — navigate, click, type, extract. "
    "Use as fallback when no API integration exists for a booking.",
)
tool_registry.define_category(
    "booking",
    "Create calendar events for completed bookings with metadata "
    "(confirmation number, address, booking URL).",
)
tool_registry.define_category(
    "email",
    "Search Gmail and read email content. Useful for finding "
    "verification codes or booking confirmations.",
)
tool_registry.define_category(
    "social",
    "Look up other CalendarAI users, check mutual availability, "
    "and send booking invites.",
)


# ---------------------------------------------------------------------------
# The meta-tool itself
# ---------------------------------------------------------------------------

@tool_registry.register("discover_tools", category="meta")
async def discover_tools(
    ctx: RunContext[AgentDeps],
    category: str = "",
) -> dict:
    """Browse available tool categories or get details about tools in a category.

    Call with no category to see all available categories.
    Call with a category name to see the tools in that category with full descriptions.

    Use this when you need to find the right tool for a task.

    Args:
        category: Category name to explore (leave empty to list all categories)
    """
    if not category:
        categories = tool_registry.get_all_categories()
        return {
            "categories": {
                name: info["description"]
                for name, info in categories.items()
            },
        }

    tools = tool_registry.get_tools_by_category(category)
    if not tools:
        all_cats = tool_registry.get_all_categories()
        return {
            "error": f"Unknown category '{category}'.",
            "available_categories": list(all_cats.keys()),
        }

    return {
        "category": category,
        "tools": tools,
    }
