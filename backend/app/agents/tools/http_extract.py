"""Lightweight HTTP content extraction — no browser session needed.

For static or server-rendered pages. Falls back gracefully when JS is required.
Use browse_page (BrowserBase) only when this tool returns insufficient content.
"""

import logging

import httpx
from bs4 import BeautifulSoup
from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry

logger = logging.getLogger("calendarai.tools.http_extract")

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_text(html: str, max_chars: int = 8000) -> dict:
    """Parse HTML and extract meaningful text content."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
        tag.decompose()

    # Try semantic containers first
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(attrs={"role": "main"})
        or soup.find(class_="content")
        or soup.find(id="content")
    )

    text = (main or soup.body or soup).get_text(separator="\n", strip=True)

    # Collapse blank lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    text = "\n".join(lines)

    # Extract metadata
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    return {
        "title": title,
        "description": meta_desc,
        "content": text[:max_chars],
        "truncated": len(text) > max_chars,
    }


@tool_registry.register("http_extract", category="search")
async def http_extract(
    ctx: RunContext[AgentDeps],
    url: str,
    max_chars: int = 8000,
) -> dict:
    """Extract text content from a web page using a simple HTTP request.
    Fast and free — no browser session needed. Works for most static and
    server-rendered pages. If the result is empty or incomplete (JS-only
    page), use browse_page instead.

    Args:
        url: The URL to fetch
        max_chars: Maximum characters of content to return (default 8000)
    """
    logger.info("http_extract url=%s", url[:100])
    try:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=15.0,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        result = _extract_text(response.text, max_chars)
        result["url"] = str(response.url)
        result["status"] = response.status_code
        return result

    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}", "url": url}
    except httpx.RequestError as e:
        return {"error": str(e), "url": url}
