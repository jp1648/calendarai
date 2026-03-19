import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, jwk
from pydantic import BaseModel

from app.config import get_settings

security = HTTPBearer()

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_TTL = 3600  # Re-fetch keys every hour


class AuthUser(BaseModel):
    id: str
    email: str


async def _get_jwks(force_refresh: bool = False) -> dict:
    global _jwks_cache, _jwks_cache_time
    if _jwks_cache and not force_refresh and (time.monotonic() - _jwks_cache_time) < _JWKS_TTL:
        return _jwks_cache
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = time.monotonic()
    return _jwks_cache


async def validate_token(token: str) -> AuthUser:
    """Validate a JWT string and return AuthUser. Raises HTTPException on failure."""
    try:
        header = jwt.get_unverified_header(token)
        jwks = await _get_jwks()

        key = None
        for k in jwks.get("keys", []):
            if k["kid"] == header.get("kid"):
                key = k
                break

        # Key not found — may be rotated, refetch once
        if not key:
            jwks = await _get_jwks(force_refresh=True)
            for k in jwks.get("keys", []):
                if k["kid"] == header.get("kid"):
                    key = k
                    break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found",
            )

        payload = jwt.decode(
            token,
            key,
            algorithms=[header.get("alg", "ES256")],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub",
            )
        return AuthUser(id=user_id, email=email)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    return await validate_token(credentials.credentials)
