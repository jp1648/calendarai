"""Web browsing tools powered by Browserbase + Playwright.

For JS-rendered pages, interactive content, or when web_extract fails.
"""

import logging

from browserbase import Browserbase
from playwright.sync_api import sync_playwright
from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.config import get_settings

logger = logging.getLogger("calendarai.tools.browse")

_client: Browserbase | None = None


def _get_client() -> Browserbase:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.browserbase_api_key:
            raise RuntimeError("BROWSERBASE_API_KEY not configured")
        _client = Browserbase(api_key=settings.browserbase_api_key)
    return _client


def _browse(url: str, wait_ms: int = 3000) -> dict:
    """Create a Browserbase session, navigate to a URL, and extract content."""
    settings = get_settings()
    client = _get_client()

    session = client.sessions.create(project_id=settings.browserbase_project_id)
    logger.info("browse session=%s url=%s", session.id, url[:100])

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.connect_over_cdp(session.connect_url)
            context = browser.contexts[0]
            page = context.pages[0]

            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(wait_ms)

            title = page.title()
            # Extract main text content, stripping nav/footer noise
            text = page.evaluate("""() => {
                const selectors = ['main', 'article', '[role="main"]', '.content', '#content'];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText.trim().length > 100) return el.innerText.trim();
                }
                return document.body.innerText.trim();
            }""")

            current_url = page.url
            page.close()
            browser.close()
    finally:
        # Always release the session to avoid hitting the concurrent session limit
        try:
            client.sessions.update(session.id, status="REQUEST_RELEASE")
        except Exception:
            logger.warning("Failed to release browse session %s", session.id)

    return {
        "url": current_url,
        "title": title,
        "content": text[:8000],  # Cap to avoid token bloat
    }


@tool_registry.register("browse_page", category="browser")
async def browse_page(
    ctx: RunContext[AgentDeps],
    url: str,
    wait_ms: int = 3000,
) -> dict:
    """Browse a web page using a real browser. Use this for pages that require
    JavaScript rendering, or when web_extract returns incomplete content.

    Args:
        url: The URL to browse
        wait_ms: Milliseconds to wait after page load for JS to render (default 3000)
    """
    logger.info("browse_page url=%s", url[:100])
    return _browse(url, wait_ms)
