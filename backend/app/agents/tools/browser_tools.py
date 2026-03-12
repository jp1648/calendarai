"""Generic browser automation tools powered by Browser-Use + Browserbase.

These tools work on ANY website — the agent decides the workflow.
"""

import logging
import os

import certifi
from browserbase import Browserbase
from browser_use import Browser, Agent
from browser_use.llm.openrouter.chat import ChatOpenRouter
from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.config import get_settings

logger = logging.getLogger("calendarai.tools.browser")

# Default model for browser automation (fast + good structured output support)
_BROWSER_MODEL = "openai/gpt-4o-mini"


def _get_llm() -> ChatOpenRouter:
    settings = get_settings()
    return ChatOpenRouter(
        model=_BROWSER_MODEL,
        api_key=settings.openrouter_api_key,
    )


async def _ensure_browser(deps: AgentDeps) -> Browser:
    """Lazily create a Browserbase session + Browser-Use browser, reuse across tool calls."""
    # Ensure SSL certs are available for CDP websocket connections
    if not os.environ.get("SSL_CERT_FILE"):
        os.environ["SSL_CERT_FILE"] = certifi.where()

    if deps._browser_use_browser and deps.browser_session_id:
        return deps._browser_use_browser

    settings = get_settings()
    if not settings.browserbase_api_key:
        raise RuntimeError(
            "Browser automation is not configured (missing BROWSERBASE_API_KEY)."
        )

    bb = Browserbase(api_key=settings.browserbase_api_key)
    bb_session = bb.sessions.create(project_id=settings.browserbase_project_id)
    logger.info("browserbase session=%s", bb_session.id)

    browser = Browser(cdp_url=bb_session.connect_url, keep_alive=True)

    deps._browser_use_browser = browser
    deps.browser_session_id = bb_session.id
    return browser


@tool_registry.register("browser_navigate", category="browser")
async def browser_navigate(
    ctx: RunContext[AgentDeps],
    url: str,
) -> dict:
    """Navigate the browser to a URL.

    Args:
        url: The URL to navigate to
    """
    try:
        browser = await _ensure_browser(ctx.deps)
        logger.info("browser_navigate url=%s", url[:100])
        agent = Agent(
            task=f"Navigate to {url}",
            llm=_get_llm(),
            browser=browser,
            max_actions_per_step=1,
            use_vision=False,
        )
        await agent.run(max_steps=2)
        return {"status": "ok", "url": url}
    except Exception as e:
        logger.error("browser_navigate failed: %s", e)
        return {"error": f"Browser navigation failed: {e}. Try again or try a different URL."}


@tool_registry.register("browser_act", category="browser")
async def browser_act(
    ctx: RunContext[AgentDeps],
    instruction: str,
) -> dict:
    """Perform an action on the current page (click, type, scroll, etc.).

    Args:
        instruction: Natural language instruction, e.g. 'click the Book Now button',
                     'type "10am" in the time field', 'scroll down to see more results'
    """
    try:
        browser = await _ensure_browser(ctx.deps)
        logger.info("browser_act instruction=%s", instruction[:100])
        agent = Agent(
            task=instruction,
            llm=_get_llm(),
            browser=browser,
            max_actions_per_step=3,
            use_vision=False,
        )
        history = await agent.run(max_steps=5)
        result = history.final_result() or "Action completed"
        return {"status": "ok", "result": str(result)[:1000]}
    except Exception as e:
        logger.error("browser_act failed: %s", e)
        return {"error": f"Browser action failed: {e}. Try a different instruction or use browser_observe first to see available elements."}


@tool_registry.register("browser_extract", category="browser")
async def browser_extract(
    ctx: RunContext[AgentDeps],
    instruction: str,
    schema: dict | None = None,
) -> dict:
    """Extract structured data from the current page.

    Args:
        instruction: What to extract, e.g. 'extract available appointment times',
                     'get the business name, address, and phone number'
        schema: Optional JSON schema for the extracted data structure
    """
    try:
        browser = await _ensure_browser(ctx.deps)
        logger.info("browser_extract instruction=%s", instruction[:100])
        agent = Agent(
            task=f"Extract the following from the current page: {instruction}",
            llm=_get_llm(),
            browser=browser,
            max_actions_per_step=1,
            use_vision=False,
        )
        history = await agent.run(max_steps=5)
        data = history.final_result() or history.extracted_content()
        return {"status": "ok", "data": data}
    except Exception as e:
        logger.error("browser_extract failed: %s", e)
        return {"error": f"Browser extraction failed: {e}. Try again with a simpler instruction."}


@tool_registry.register("browser_observe", category="browser")
async def browser_observe(
    ctx: RunContext[AgentDeps],
    instruction: str,
) -> dict:
    """Observe the current page to discover available actions/elements.

    Args:
        instruction: What to look for, e.g. 'find booking buttons',
                     'find available time slots', 'find the search form'
    """
    try:
        browser = await _ensure_browser(ctx.deps)
        logger.info("browser_observe instruction=%s", instruction[:100])
        agent = Agent(
            task=f"Observe the current page and list available elements/actions related to: {instruction}. Do NOT click anything or navigate, just observe and report.",
            llm=_get_llm(),
            browser=browser,
            max_actions_per_step=1,
            use_vision=False,
            extend_system_message="Do NOT click, type, or navigate. Only observe and report what you see.",
        )
        history = await agent.run(max_steps=3)
        observations = history.final_result() or history.extracted_content()
        return {"status": "ok", "observations": observations}
    except Exception as e:
        logger.error("browser_observe failed: %s", e)
        return {"error": f"Browser observation failed: {e}. Try again with a different instruction."}
