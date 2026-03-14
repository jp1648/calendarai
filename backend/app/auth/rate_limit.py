"""Per-user rate limiting via Supabase rate_limits table."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.middleware import AuthUser, get_current_user
from app.config import get_settings
from app.services.supabase import get_supabase_admin

security = HTTPBearer()

# Limits per window
_LIMITS = {
    "min": 10,
    "hour": 60,
    "day": 200,
}

_DAILY_TOKEN_BUDGET = 50_000


def _get_unlimited_emails() -> set[str]:
    """Parse unlimited emails from settings (comma-separated env var)."""
    raw = get_settings().unlimited_emails
    if not raw:
        return set()
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


async def check_rate_limit(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """FastAPI dependency that validates auth AND checks rate limits.

    Replaces Depends(get_current_user) on rate-limited endpoints.
    """
    user = await get_current_user(credentials)

    if user.email and user.email.lower() in _get_unlimited_emails():
        return user

    sb = get_supabase_admin()

    now = datetime.now(timezone.utc)
    keys = [
        f"min:{now.strftime('%Y-%m-%dT%H:%M')}",
        f"hour:{now.strftime('%Y-%m-%dT%H')}",
        f"day:{now.strftime('%Y-%m-%d')}",
    ]

    # Atomically increment all windows and get new counts
    result = sb.rpc(
        "increment_rate_limits",
        {"p_user_id": user.id, "p_keys": keys},
    ).execute()

    for row in result.data:
        key = row.get("out_window_key") or row.get("window_key", "")
        prefix = key.split(":")[0]
        limit = _LIMITS.get(prefix)
        count = row.get("out_request_count") or row.get("request_count", 0)
        if limit and count > limit:
            if prefix == "day":
                detail = "You've reached your daily AI usage limit. Resets at midnight UTC."
            else:
                detail = "Too many requests. Please wait a moment."
            raise HTTPException(
                status_code=429,
                detail=detail,
                headers={"Retry-After": "60"},
            )

    # Check daily token budget
    day_key = f"day:{now.strftime('%Y-%m-%d')}"
    day_row = sb.table("rate_limits").select("tokens_used").eq(
        "user_id", user.id
    ).eq("window_key", day_key).maybe_single().execute()
    if day_row.data and (day_row.data.get("tokens_used") or 0) >= _DAILY_TOKEN_BUDGET:
        raise HTTPException(
            status_code=429,
            detail="You've reached your daily AI usage limit. Resets at midnight UTC.",
            headers={"Retry-After": "3600"},
        )

    return user


def update_token_usage(user_id: str, tokens: int):
    """Record token usage against the daily budget. Called after agent run."""
    if not tokens:
        return
    sb = get_supabase_admin()
    day_key = f"day:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    sb.rpc(
        "update_token_usage",
        {"p_user_id": user_id, "p_day_key": day_key, "p_tokens": tokens},
    ).execute()
