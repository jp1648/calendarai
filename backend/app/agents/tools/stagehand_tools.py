"""Generic browser automation tools powered by Stagehand + Browserbase.

These tools work on ANY website — the agent decides the workflow.
"""

import logging

from pydantic_ai import RunContext
from stagehand import AsyncStagehand

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry
from app.config import get_settings

logger = logging.getLogger("calendarai.tools.stagehand")


async def _ensure_session(deps: AgentDeps) -> tuple[AsyncStagehand, str]:
    """Lazily create a Stagehand session, reuse across tool calls in one run."""
    if deps._stagehand_client and deps.browser_session_id:
        return deps._stagehand_client, deps.browser_session_id

    settings = get_settings()
    if not settings.browserbase_api_key:
        raise RuntimeError(
            "Browser automation is not configured (missing BROWSERBASE_API_KEY)."
        )

    client = AsyncStagehand(
        browserbase_api_key=settings.browserbase_api_key,
        browserbase_project_id=settings.browserbase_project_id,
        model_api_key=settings.openrouter_api_key,
    )
    session = await client.sessions.start(
        model_name="anthropic/claude-sonnet-4-6",
        browser={"type": "browserbase"},
    )
    deps._stagehand_client = client
    deps.browser_session_id = session.id
    logger.info("stagehand session started id=%s", session.id)
    return client, session.id


@tool_registry.register("browser_navigate")
async def browser_navigate(
    ctx: RunContext[AgentDeps],
    url: str,
) -> dict:
    """Navigate the browser to a URL.

    Args:
        url: The URL to navigate to
    """
    try:
        client, session_id = await _ensure_session(ctx.deps)
        logger.info("browser_navigate url=%s", url[:100])
        await client.sessions.navigate(session_id=session_id, url=url)
        return {"status": "ok", "url": url}
    except Exception as e:
        logger.error("browser_navigate failed: %s", e)
        return {"error": f"Browser navigation failed: {e}. Try again or try a different URL."}


@tool_registry.register("browser_act")
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
        client, session_id = await _ensure_session(ctx.deps)
        logger.info("browser_act instruction=%s", instruction[:100])
        result = await client.sessions.act(
            id=session_id,
            input=instruction,
            stream_response=False,
            x_stream_response="false",
        )
        return {"status": "ok", "result": str(result)[:1000]}
    except Exception as e:
        logger.error("browser_act failed: %s", e)
        return {"error": f"Browser action failed: {e}. Try a different instruction or use browser_observe first to see available elements."}


@tool_registry.register("browser_extract")
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
        client, session_id = await _ensure_session(ctx.deps)
        logger.info("browser_extract instruction=%s", instruction[:100])
        kwargs: dict = {
            "id": session_id,
            "instruction": instruction,
            "stream_response": False,
            "x_stream_response": "false",
        }
        if schema:
            kwargs["schema"] = schema
        result = await client.sessions.extract(**kwargs)
        return {"status": "ok", "data": result}
    except Exception as e:
        logger.error("browser_extract failed: %s", e)
        return {"error": f"Browser extraction failed: {e}. Try again with a simpler instruction."}


@tool_registry.register("browser_observe")
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
        client, session_id = await _ensure_session(ctx.deps)
        logger.info("browser_observe instruction=%s", instruction[:100])
        result = await client.sessions.observe(
            id=session_id,
            instruction=instruction,
            stream_response=False,
            x_stream_response="false",
        )
        return {"status": "ok", "observations": result}
    except Exception as e:
        logger.error("browser_observe failed: %s", e)
        return {"error": f"Browser observation failed: {e}. Try again with a different instruction."}
