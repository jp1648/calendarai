from enum import Enum
from pydantic import BaseModel, Field


class TriggerMode(str, Enum):
    PULL = "pull"   # User-initiated
    PUSH = "push"   # Webhook/background


class RunStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentRequest(BaseModel):
    """Unified input for any agent invocation."""
    agent_name: str = Field(max_length=50)
    input: str = Field(max_length=5000)
    trigger_mode: TriggerMode = TriggerMode.PULL
    metadata: dict = Field(default_factory=dict)


class AgentResponse(BaseModel):
    """Unified output from any agent invocation."""
    run_id: str
    agent_name: str
    status: RunStatus
    message: str
    events_created: list[dict] = Field(default_factory=list)
    tokens_used: int | None = None
    model_used: str | None = None


class AgentConfig(BaseModel):
    """Declarative agent configuration."""
    name: str
    model: str
    system_prompt: str
    tools: list[str]          # Tool names from the registry
    trigger_mode: TriggerMode
    description: str = ""
