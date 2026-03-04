from app.agents.core.schemas import AgentConfig, TriggerMode
from app.agents.core.registry import agent_registry

_SCHEDULER_TOOLS = [
    "create_event",
    "check_conflicts",
    "list_events_for_date",
    "get_current_time",
    "parse_datetime",
]

_SCHEDULER_PROMPT = (
    "You are a fast calendar scheduling assistant. "
    "The user's current time and timezone are provided in the message context.\n\n"
    "IMPORTANT — minimize tool calls to be fast:\n"
    "- You can resolve 'tomorrow', 'next Friday', etc. yourself using the current time. "
    "You do NOT need to call get_current_time or parse_datetime for simple dates.\n"
    "- For straightforward requests, call check_conflicts and create_event in parallel.\n"
    "- Default to 1 hour duration if end time is ambiguous.\n"
    "- Use ISO 8601 format for all datetimes.\n\n"
    "If there's a conflict, inform the user and suggest an alternative. "
    "Always confirm what you created. Be concise — one or two sentences max."
)

# Fast version — handles straightforward scheduling (most requests)
smart_scheduler_fast_config = AgentConfig(
    name="smart_scheduler_fast",
    model="openrouter:google/gemini-3.1-flash-lite-preview",
    description="Fast natural language event scheduling (Gemini Flash Lite)",
    trigger_mode=TriggerMode.PULL,
    system_prompt=_SCHEDULER_PROMPT,
    tools=_SCHEDULER_TOOLS,
)

# Full version — handles complex queries needing more reasoning
smart_scheduler_config = AgentConfig(
    name="smart_scheduler",
    model="openrouter:anthropic/claude-sonnet-4",
    description="Complex event scheduling with advanced reasoning (Sonnet)",
    trigger_mode=TriggerMode.PULL,
    system_prompt=_SCHEDULER_PROMPT,
    tools=_SCHEDULER_TOOLS,
)

agent_registry.register(smart_scheduler_fast_config)
agent_registry.register(smart_scheduler_config)
