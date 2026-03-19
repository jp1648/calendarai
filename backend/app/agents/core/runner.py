import asyncio
import json
import time
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from pydantic import TypeAdapter
from pydantic_ai.messages import (
    ModelMessage,
    PartStartEvent,
    PartDeltaEvent,
    TextPart,
    TextPartDelta,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
)
from pydantic_ai._agent_graph import ModelRequestNode, CallToolsNode
from pydantic_graph import End

from app.agents.deps import AgentDeps
from app.agents.core.schemas import (
    AgentRequest,
    AgentResponse,
    RunStatus,
    TriggerMode,
)
from app.agents.core.registry import agent_registry
from app.auth.rate_limit import update_token_usage
from app.services.encryption import decrypt
from app.services.gmail import get_gmail_credentials
from app.services.supabase import get_supabase_admin

logger = logging.getLogger("calendarai.agents")

_messages_ta = TypeAdapter(list[ModelMessage])


class AgentRunner:
    """Generic agent runner with observability, error handling, and cost tracking.

    Usage:
        runner = AgentRunner()
        response = await runner.run(
            AgentRequest(agent_name="smart_scheduler", input="lunch tomorrow"),
            user_id="...",
            user_email="...",
        )
    """

    async def _cleanup_browser(self, deps: AgentDeps) -> None:
        """Stop Browser-Use session and release BrowserBase session."""
        if deps._browser_use_browser:
            try:
                await deps._browser_use_browser.stop()
                logger.info("browser session stopped id=%s", deps.browser_session_id)
            except Exception as e:
                logger.warning("browser-use cleanup failed: %s", str(e)[:200])
            finally:
                deps._browser_use_browser = None

        if deps.browser_session_id:
            try:
                from browserbase import Browserbase
                from app.config import get_settings
                bb = Browserbase(api_key=get_settings().browserbase_api_key)
                bb.sessions.update(deps.browser_session_id, status="REQUEST_RELEASE")
            except Exception as e:
                logger.warning("browserbase release failed: %s", str(e)[:200])
            finally:
                deps.browser_session_id = None

    async def build_deps(
        self,
        user_id: str,
        user_email: str,
        gmail_credentials=None,
    ) -> AgentDeps:
        """Build AgentDeps from user info, fetching profile data."""
        sb = get_supabase_admin()
        profile = await asyncio.to_thread(
            lambda: sb.table("profiles")
            .select("timezone, full_name, phone, default_location, gmail_connected, gmail_refresh_token, resy_connected, resy_auth_token")
            .eq("id", user_id)
            .single()
            .execute()
        )
        data = profile.data or {}
        tz = data.get("timezone", "America/New_York")

        # Auto-fetch Gmail credentials if connected and not already provided
        if not gmail_credentials and data.get("gmail_connected") and data.get("gmail_refresh_token"):
            try:
                refresh_token = decrypt(data["gmail_refresh_token"])
                gmail_credentials = get_gmail_credentials(refresh_token)
            except Exception as e:
                logger.warning("Failed to decrypt Gmail credentials for user=%s: %s", user_id, e)

        # Decrypt Resy auth token if connected
        resy_token = None
        if data.get("resy_connected") and data.get("resy_auth_token"):
            try:
                resy_token = decrypt(data["resy_auth_token"])
            except Exception as e:
                logger.warning("Failed to decrypt Resy token for user=%s: %s", user_id, e)

        return AgentDeps(
            user_id=user_id,
            user_email=user_email,
            user_timezone=tz,
            user_full_name=data.get("full_name", ""),
            user_phone=data.get("phone", ""),
            user_default_location=data.get("default_location", ""),
            supabase=sb,
            gmail_credentials=gmail_credentials,
            resy_auth_token=resy_token,
        )

    def _build_user_input(self, deps: AgentDeps, raw_input: str, location: str | None = None) -> str:
        """Build user input string with injected context (time, profile, location)."""
        tz = ZoneInfo(deps.user_timezone)
        now = datetime.now(tz)
        context_parts = [
            f"Current time: {now.strftime('%A, %B %d, %Y %I:%M %p')}",
            f"Timezone: {deps.user_timezone}",
            f"ISO: {now.isoformat()}",
        ]
        if location:
            context_parts.append(f"User location: {location}")
        elif deps.user_default_location:
            context_parts.append(f"User location: {deps.user_default_location}")
        if deps.user_full_name:
            context_parts.append(f"User name: {deps.user_full_name}")
        if deps.user_phone:
            context_parts.append(f"User phone: {deps.user_phone}")
        context_parts.append(f"User email: {deps.user_email}")
        if deps.resy_auth_token:
            context_parts.append("Resy: connected")
        return f"[{' | '.join(context_parts)}]\n\n{raw_input}"

    async def run(
        self,
        request: AgentRequest,
        user_id: str,
        user_email: str,
        gmail_credentials=None,
    ) -> AgentResponse:
        """Execute an agent with full observability."""
        config = agent_registry.get_config(request.agent_name)
        agent = agent_registry.get(request.agent_name)
        deps = await self.build_deps(user_id, user_email, gmail_credentials)
        sb = deps.supabase

        # Log the run
        run_id = self._log_start(sb, user_id, request, config.model)

        # Inject current time + profile context
        user_input = self._build_user_input(deps, request.input)

        start = time.monotonic()
        try:
            result = await agent.run(user_input, deps=deps)
            elapsed = time.monotonic() - start

            # Gather created events
            events = self._fetch_created_events(
                sb, user_id, request.agent_name
            )

            # Extract token usage
            tokens = None
            try:
                tokens = result.usage().total_tokens
            except Exception:
                pass

            self._log_complete(sb, run_id, str(result.output), len(events), tokens)

            logger.info(
                "agent=%s status=completed events=%d tokens=%s elapsed=%.2fs",
                request.agent_name, len(events), tokens, elapsed,
            )

            return AgentResponse(
                run_id=run_id,
                agent_name=request.agent_name,
                status=RunStatus.COMPLETED,
                message=str(result.output),
                events_created=events,
                tokens_used=tokens,
                model_used=config.model,
            )

        except Exception as e:
            elapsed = time.monotonic() - start
            self._log_fail(sb, run_id, str(e))

            logger.error(
                "agent=%s status=failed error=%s elapsed=%.2fs",
                request.agent_name, str(e)[:200], elapsed,
            )

            return AgentResponse(
                run_id=run_id,
                agent_name=request.agent_name,
                status=RunStatus.FAILED,
                message=str(e),
                model_used=config.model,
            )

        finally:
            await self._cleanup_browser(deps)

    async def run_stream(
        self,
        input_text: str,
        agent_name: str,
        user_id: str,
        user_email: str,
        thread_id: str | None = None,
        gmail_credentials=None,
        location: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> AsyncGenerator[str, None]:
        """Execute an agent with SSE streaming output."""
        config = agent_registry.get_config(agent_name)
        agent = agent_registry.get(agent_name)
        deps = await self.build_deps(user_id, user_email, gmail_credentials)
        if latitude is not None and longitude is not None:
            deps.user_latitude = latitude
            deps.user_longitude = longitude
        sb = deps.supabase

        # Load or create thread
        history: list[ModelMessage] = []
        if thread_id:
            history = _load_thread(sb, thread_id, user_id)
        else:
            thread_id = str(uuid4())

        yield f"event: thread\ndata: {json.dumps({'thread_id': thread_id})}\n\n"

        # Inject current time + location + profile context
        user_input = self._build_user_input(deps, input_text, location=location)

        request = AgentRequest(agent_name=agent_name, input=input_text)
        run_id = self._log_start(sb, user_id, request, config.model)
        run_start = datetime.now(timezone.utc).isoformat()

        start = time.monotonic()
        tokens = None
        try:
            async with agent.iter(
                user_input, deps=deps, message_history=history
            ) as agent_run:
                async for node in agent_run:
                    if isinstance(node, ModelRequestNode):
                        # Stream text deltas from the model in real-time
                        async with node.stream(agent_run.ctx) as agent_stream:
                            async for event in agent_stream:
                                if isinstance(event, PartStartEvent) and isinstance(event.part, TextPart) and event.part.content:
                                    yield f"event: text_delta\ndata: {json.dumps({'delta': event.part.content})}\n\n"
                                elif isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
                                    yield f"event: text_delta\ndata: {json.dumps({'delta': event.delta.content_delta})}\n\n"

                    elif isinstance(node, CallToolsNode):
                        # Stream tool calls and results as they execute
                        async with node.stream(agent_run.ctx) as tool_events:
                            async for event in tool_events:
                                if isinstance(event, FunctionToolCallEvent):
                                    yield (
                                        f"event: tool_call\n"
                                        f"data: {json.dumps({'tool': event.part.tool_name, 'args': event.part.args_as_dict()})}\n\n"
                                    )
                                elif isinstance(event, FunctionToolResultEvent):
                                    content = ""
                                    if hasattr(event.result, 'content') and event.result.content:
                                        content = str(event.result.content)[:200]
                                    tool_name = getattr(event.result, 'tool_name', "")
                                    yield (
                                        f"event: tool_result\n"
                                        f"data: {json.dumps({'tool': tool_name, 'summary': content})}\n\n"
                                    )

                    elif isinstance(node, End):
                        break

                # Save thread with full conversation
                all_messages = agent_run.all_messages()
                _save_thread(sb, thread_id, user_id, all_messages)

                # Token usage
                try:
                    tokens = agent_run.usage().total_tokens
                except Exception:
                    pass

                if tokens:
                    update_token_usage(user_id, tokens)

            elapsed = time.monotonic() - start

            # Fetch events created during this turn
            events = self._fetch_created_events(
                sb, user_id, agent_name, since=run_start
            )
            self._log_complete(sb, run_id, "", len(events), tokens)

            logger.info(
                "agent=%s status=streamed events=%d tokens=%s elapsed=%.2fs",
                agent_name, len(events), tokens, elapsed,
            )

            yield f"event: done\ndata: {json.dumps({'events_created': events, 'run_id': run_id})}\n\n"

        except Exception as e:
            self._log_fail(sb, run_id, str(e))
            logger.error(
                "agent=%s status=stream_failed error=%s", agent_name, str(e)[:200],
                exc_info=True,
            )
            yield f"event: error\ndata: {json.dumps({'error': 'Something went wrong. Please try again.'})}\n\n"

        finally:
            await self._cleanup_browser(deps)

    # -- Observability helpers --

    def _log_start(self, sb, user_id: str, request: AgentRequest, model: str) -> str:
        row = sb.table("agent_runs").insert({
            "user_id": user_id,
            "agent_name": request.agent_name,
            "trigger_mode": request.trigger_mode.value,
            "input_summary": request.input[:200],
            "model_used": model,
            "status": RunStatus.RUNNING.value,
        }).execute()
        return row.data[0]["id"]

    def _log_complete(self, sb, run_id: str, output: str, events_created: int, tokens: int | None):
        sb.table("agent_runs").update({
            "status": RunStatus.COMPLETED.value,
            "output_summary": output[:500],
            "events_created": events_created,
            "tokens_used": tokens,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()

    def _log_fail(self, sb, run_id: str, error: str):
        sb.table("agent_runs").update({
            "status": RunStatus.FAILED.value,
            "output_summary": error[:500],
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()

    def _fetch_created_events(
        self, sb, user_id: str, agent_name: str, since: str | None = None,
    ) -> list[dict]:
        """Fetch events created by this agent run (most recent, matching source)."""
        source_map = {
            "smart_scheduler": "schedule_agent",
            "smart_scheduler_fast": "schedule_agent",
            "email_parser": "email_agent",
        }
        source = source_map.get(agent_name)
        if not source:
            return []

        query = (
            sb.table("events")
            .select("*")
            .eq("user_id", user_id)
            .eq("source", source)
        )
        if since:
            query = query.gte("created_at", since)

        result = query.order("created_at", desc=True).limit(5).execute()
        return result.data


# -- Thread storage helpers --

def _load_thread(sb, thread_id: str, user_id: str) -> list[ModelMessage]:
    """Load conversation history from agent_threads table."""
    result = (
        sb.table("agent_threads")
        .select("messages")
        .eq("id", thread_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return []
    raw = result.data["messages"]
    if isinstance(raw, str):
        return _messages_ta.validate_json(raw)
    return _messages_ta.validate_python(raw)


def _save_thread(sb, thread_id: str, user_id: str, messages: list[ModelMessage]):
    """Save conversation history to agent_threads table."""
    serialized = json.loads(_messages_ta.dump_json(messages))
    sb.table("agent_threads").upsert({
        "id": thread_id,
        "user_id": user_id,
        "messages": serialized,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
