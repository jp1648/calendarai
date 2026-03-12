"""Web search and extraction tools powered by Tavily."""

import logging

from tavily import TavilyClient
from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.config import get_settings

logger = logging.getLogger("calendarai.tools.web")

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.tavily_api_key:
            raise RuntimeError("TAVILY_API_KEY not configured")
        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


@tool_registry.register("web_search", category="search")
async def web_search(
    ctx: RunContext[AgentDeps],
    query: str,
    max_results: int = 5,
    search_depth: str = "basic",
    topic: str = "general",
    include_answer: bool = True,
    time_range: str | None = None,
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
) -> dict:
    """Search the web for information.

    Args:
        query: The search query
        max_results: Number of results to return (1-20, default 5)
        search_depth: 'basic' (fast, 1 credit) or 'advanced' (thorough, 2 credits)
        topic: 'general' or 'news'
        include_answer: Whether to include an AI-generated summary answer
        time_range: Filter by recency - 'day', 'week', 'month', 'year', or None
        include_domains: Only include results from these domains
        exclude_domains: Exclude results from these domains
    """
    client = _get_client()
    kwargs: dict = {
        "query": query,
        "max_results": min(max_results, 20),
        "search_depth": search_depth,
        "topic": topic,
        "include_answer": include_answer,
    }
    if time_range:
        kwargs["time_range"] = time_range
    if include_domains:
        kwargs["include_domains"] = include_domains
    if exclude_domains:
        kwargs["exclude_domains"] = exclude_domains

    logger.info("web_search query=%s depth=%s", query[:80], search_depth)
    response = client.search(**kwargs)

    # Return a clean subset the agent can reason over
    results = [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "content": r.get("content", ""),
        }
        for r in response.get("results", [])
    ]

    return {
        "answer": response.get("answer"),
        "results": results,
        "query": response.get("query", query),
    }


@tool_registry.register("web_extract", category="search")
async def web_extract(
    ctx: RunContext[AgentDeps],
    urls: list[str],
) -> list[dict]:
    """Extract full content from web pages. Use this when you need the complete
    text of a page rather than just a search snippet.

    Args:
        urls: List of URLs to extract content from (max 20)
    """
    client = _get_client()
    logger.info("web_extract urls=%d", len(urls))
    response = client.extract(urls=urls[:20])

    return [
        {
            "url": r.get("url", ""),
            "content": r.get("raw_content", "")[:5000],  # Cap to avoid token bloat
        }
        for r in response.get("results", [])
    ]
