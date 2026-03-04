# Bootstrap: register all tools first, then all agents
import app.agents.tools  # noqa: F401 — triggers @tool_registry.register decorators
import app.agents.smart_scheduler  # noqa: F401 — registers agent config
import app.agents.email_parser  # noqa: F401 — registers agent config
