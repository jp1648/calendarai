from typing import Callable
from pydantic_ai import Agent

from app.agents.deps import AgentDeps
from app.agents.core.schemas import AgentConfig


class ToolRegistry:
    """Central registry for all agent tools, organized by category.

    Tools are registered with a category so agents can discover them
    dynamically via the discover_tools meta-tool instead of relying on
    prompt instructions.

    Usage:
        @tool_registry.register("create_event", category="calendar")
        async def create_event(ctx, ...): ...
    """

    def __init__(self):
        self._tools: dict[str, Callable] = {}
        self._tool_categories: dict[str, str] = {}  # tool_name -> category
        self._categories: dict[str, str] = {}  # category -> description

    def define_category(self, name: str, description: str):
        """Define a tool category with a human-readable description."""
        self._categories[name] = description

    def register(self, name: str | None = None, category: str = "general"):
        """Decorator to register a tool function with an optional category."""
        def decorator(fn: Callable) -> Callable:
            key = name or fn.__name__
            self._tools[key] = fn
            self._tool_categories[key] = category
            return fn
        return decorator

    def get(self, name: str) -> Callable:
        if name not in self._tools:
            raise KeyError(f"Tool '{name}' not registered. Available: {list(self._tools.keys())}")
        return self._tools[name]

    def resolve(self, names: list[str]) -> list[Callable]:
        """Resolve a list of tool names to their functions."""
        return [self.get(n) for n in names]

    def get_tools_by_category(self, category: str) -> list[dict]:
        """Get all tools in a category with their name and first-line description."""
        tools = []
        for tool_name, cat in self._tool_categories.items():
            if cat == category:
                fn = self._tools[tool_name]
                doc = (fn.__doc__ or "").strip()
                tools.append({
                    "name": tool_name,
                    "description": doc,
                })
        return tools

    def get_all_categories(self) -> dict[str, dict]:
        """Get all categories with descriptions and tool counts."""
        result = {}
        for cat_name, cat_desc in self._categories.items():
            tool_names = [n for n, c in self._tool_categories.items() if c == cat_name]
            if tool_names:
                result[cat_name] = {
                    "description": cat_desc,
                    "tools": tool_names,
                }
        return result

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
        # Clear cached instance so it rebuilds with updated config
        self._instances.pop(config.name, None)

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
