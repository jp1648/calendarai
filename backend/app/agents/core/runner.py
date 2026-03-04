import time
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.agents.deps import AgentDeps
from app.agents.core.schemas import (
    AgentRequest,
    AgentResponse,
    RunStatus,
    TriggerMode,
)
from app.agents.core.registry import agent_registry
from app.services.supabase import get_supabase_admin

logger = logging.getLogger("calendarai.agents")


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

    async def build_deps(
        self,
        user_id: str,
        user_email: str,
        gmail_credentials=None,
    ) -> AgentDeps:
        """Build AgentDeps from user info, fetching profile data."""
        sb = get_supabase_admin()
        profile = (
            sb.table("profiles")
            .select("timezone")
            .eq("id", user_id)
            .single()
            .execute()
        )
        tz = profile.data["timezone"] if profile.data else "America/New_York"

        return AgentDeps(
            user_id=user_id,
            user_email=user_email,
            user_timezone=tz,
            supabase=sb,
            gmail_credentials=gmail_credentials,
        )

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

        # Inject current time context so the agent doesn't waste a tool call
        tz = ZoneInfo(deps.user_timezone)
        now = datetime.now(tz)
        user_input = (
            f"[Current time: {now.strftime('%A, %B %d, %Y %I:%M %p')} | "
            f"Timezone: {deps.user_timezone} | ISO: {now.isoformat()}]\n\n"
            f"{request.input}"
        )

        start = time.monotonic()
        try:
            result = await agent.run(user_input, deps=deps)
            elapsed = time.monotonic() - start

            # Gather created events
            events = self._fetch_created_events(
                sb, user_id, request.agent_name, start_time=elapsed
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

    def _fetch_created_events(self, sb, user_id: str, agent_name: str, start_time: float) -> list[dict]:
        """Fetch events created by this agent run (most recent, matching source)."""
        source_map = {
            "smart_scheduler": "schedule_agent",
            "smart_scheduler_fast": "schedule_agent",
            "email_parser": "email_agent",
        }
        source = source_map.get(agent_name)
        if not source:
            return []

        result = (
            sb.table("events")
            .select("*")
            .eq("user_id", user_id)
            .eq("source", source)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        return result.data
