from dataclasses import dataclass, field
from typing import Any

from supabase import Client


@dataclass
class AgentDeps:
    user_id: str
    user_email: str
    user_timezone: str
    supabase: Client
    user_full_name: str = ""
    user_phone: str = ""
    user_default_location: str = ""
    gmail_credentials: Any | None = None
    browser_session_id: str | None = None
    _stagehand_client: Any | None = field(default=None, repr=False)
