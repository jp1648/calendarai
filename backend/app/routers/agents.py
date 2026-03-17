from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth.middleware import AuthUser, get_current_user
from app.auth.rate_limit import check_rate_limit
from app.agents.core import AgentRequest, AgentResponse, AgentRunner, RunStatus, agent_registry
from app.agents.core.router import pick_scheduler


class ScheduleRequest(BaseModel):
    input: str = Field(max_length=2000)
    thread_id: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

router = APIRouter(prefix="/api/agents", tags=["agents"])
runner = AgentRunner()


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    body: AgentRequest,
    user: AuthUser = Depends(check_rate_limit),
):
    """Generic endpoint: run any registered agent by name."""
    if body.agent_name not in agent_registry.available:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent '{body.agent_name}'. Available: {agent_registry.available}",
        )

    response = await runner.run(body, user_id=user.id, user_email=user.email)

    if response.status == RunStatus.FAILED:
        raise HTTPException(status_code=500, detail=response.message)

    return response


@router.post("/schedule", response_model=AgentResponse)
async def schedule_event(
    body: ScheduleRequest,
    user: AuthUser = Depends(check_rate_limit),
):
    """Convenience endpoint — auto-routes to Haiku (fast) or Sonnet (complex)."""
    user_input = body.input
    agent_name = pick_scheduler(user_input)
    request = AgentRequest(
        agent_name=agent_name,
        input=user_input,
    )
    response = await runner.run(request, user_id=user.id, user_email=user.email)

    if response.status == RunStatus.FAILED:
        raise HTTPException(status_code=500, detail=response.message)

    return response


@router.post("/schedule/stream")
async def schedule_stream(
    body: ScheduleRequest,
    user: AuthUser = Depends(check_rate_limit),
):
    """SSE streaming endpoint — auto-routes and streams text deltas, tool events, and results."""
    user_input = body.input
    thread_id = body.thread_id
    location = body.location
    latitude = body.latitude
    longitude = body.longitude
    agent_name = pick_scheduler(user_input)

    return StreamingResponse(
        runner.run_stream(
            input_text=user_input,
            agent_name=agent_name,
            user_id=user.id,
            user_email=user.email,
            thread_id=thread_id,
            location=location,
            latitude=latitude,
            longitude=longitude,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/available")
async def list_agents():
    """List all registered agents and their configs."""
    agents = []
    for name in agent_registry.available:
        config = agent_registry.get_config(name)
        agents.append({
            "name": config.name,
            "description": config.description,
            "model": config.model,
            "trigger_mode": config.trigger_mode.value,
            "tools": config.tools,
        })
    return {"agents": agents}
