from dataclasses import dataclass
from typing import Any

from supabase import Client


@dataclass
class AgentDeps:
    user_id: str
    user_email: str
    user_timezone: str
    supabase: Client
    gmail_credentials: Any | None = None
