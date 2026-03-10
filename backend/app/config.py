from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    openrouter_api_key: str

    tavily_api_key: str = ""
    browserbase_api_key: str = ""
    browserbase_project_id: str = ""

    mindbody_api_key: str = ""
    mindbody_site_id: str = "-99"  # -99 = sandbox

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    google_pubsub_topic: str = ""

    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:8081"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
