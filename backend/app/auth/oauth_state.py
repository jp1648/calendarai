"""OAuth state parameter signing and verification.

Prevents CSRF/state-fixation attacks by signing the user_id with HMAC
so callback endpoints can verify the state wasn't tampered with.
"""

import hashlib
import hmac
import time

from fastapi import HTTPException

from app.config import get_settings

# State tokens are valid for 10 minutes
STATE_TTL_SECONDS = 600


def sign_state(user_id: str) -> str:
    """Create a signed state parameter: user_id:timestamp:signature."""
    settings = get_settings()
    ts = str(int(time.time()))
    payload = f"{user_id}:{ts}"
    sig = hmac.new(
        settings.encryption_key.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()[:16]
    return f"{payload}:{sig}"


def verify_state(state: str) -> str:
    """Verify a signed state parameter and return the user_id.

    Raises HTTPException if the state is invalid or expired.
    """
    parts = state.split(":")
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    user_id, ts_str, sig = parts

    # Verify signature
    settings = get_settings()
    payload = f"{user_id}:{ts_str}"
    expected_sig = hmac.new(
        settings.encryption_key.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()[:16]

    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=400, detail="Invalid OAuth state signature")

    # Verify not expired
    try:
        ts = int(ts_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid OAuth state timestamp")

    if time.time() - ts > STATE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail="OAuth state expired — please try again")

    return user_id
