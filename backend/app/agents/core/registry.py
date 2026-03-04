from typing import Callable
from pydantic_ai import Agent

from app.agents.deps import AgentDeps
from app.agents.core.schemas import AgentConfig


class ToolRegistry:
    """Central registry for all agent tools.

    Register once, reference by name in agent configs.
    """

    def __init__(self):
        self._tools: dict[str, Callable] = {}

    def register(self, name: str | None = None):
        """Decorator to register a tool function."""
        def decorator(fn: Callable) -> Callable:
            key = name or fn.__name__
            self._tools[key] = fn
            return fn
        return decorator

    def get(self, name: str) -> Callable:
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' not registered. Available: {list(self._tools.keys())}")
        return self._tools[name]

    def resolve(self, names: list[str]) -> list[Callable]:
        """Resolve a list of tool names to their functions."""
        return [self.get(n) for n in names]

    @property
    def available(self) -> list[str]:
        return list(self._tools.keys())


class AgentRegistry:
    """Central registry for agent configurations and instances.

    Agents are lazily instantiated on first use.
    """

    def __init__(self, tools: ToolRegistry):
        self._configs: dict[str, AgentConfig] = {}
        self._instances: dict[str, Agent] = {}
        self._tools = tools

    def register(self, config: AgentConfig):
        """Register an agent configuration."""
        self._configs[config.name] = config

    def get(self, name: str) -> Agent:
        """Get or create an Agent instance by name."""
        if name not in self._configs:
            raise KeyError(f"Agent '{name}' not registered. Available: {list(self._configs.keys())}")

        if name not in self._instances:
            self._instances[name] = self._build(name)

        return self._instances[name]

    def get_config(self, name: str) -> AgentConfig:
        if name not in self._configs:
            raise KeyError(f"Agent '{name}' not registered.")
        return self._configs[name]

    def _build(self, name: str) -> Agent:
        """Build a Pydantic AI Agent from a config."""
        config = self._configs[name]
        tools = self._tools.resolve(config.tools)

        return Agent(
            config.model,
            deps_type=AgentDeps,
            system_prompt=config.system_prompt,
            tools=tools,
        )

    @property
    def available(self) -> list[str]:
        return list(self._configs.keys())


# Global singletons
tool_registry = ToolRegistry()
agent_registry = AgentRegistry(tool_registry)
