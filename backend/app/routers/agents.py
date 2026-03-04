from fastapi import APIRouter, Depends, HTTPException

from app.auth.middleware import AuthUser, get_current_user
from app.agents.core import AgentRequest, AgentResponse, AgentRunner, RunStatus, agent_registry
from app.agents.core.router import pick_scheduler

router = APIRouter(prefix="/api/agents", tags=["agents"])
runner = AgentRunner()


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    body: AgentRequest,
    user: AuthUser = Depends(get_current_user),
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
    body: dict,
    user: AuthUser = Depends(get_current_user),
):
    """Convenience endpoint — auto-routes to Haiku (fast) or Sonnet (complex)."""
    user_input = body.get("input", "")
    agent_name = pick_scheduler(user_input)
    request = AgentRequest(
        agent_name=agent_name,
        input=user_input,
    )
    response = await runner.run(request, user_id=user.id, user_email=user.email)

    if response.status == RunStatus.FAILED:
        raise HTTPException(status_code=500, detail=response.message)

    return response


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
