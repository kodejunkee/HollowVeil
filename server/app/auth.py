"""
JWT authentication helpers for HollowVeil.

Verifies Supabase-issued JWTs using HS256 + the shared JWT secret.
Returns an AuthenticatedUser with user_id and display_name.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, status

from app.config import get_settings


@dataclass
class AuthenticatedUser:
    """Represents a successfully authenticated user."""
    user_id: str
    display_name: str


def verify_token(token: str) -> AuthenticatedUser:
    """Decode a Supabase JWT and return an AuthenticatedUser.

    Parameters
    ----------
    token:
        Raw JWT string, typically passed as a query parameter on WebSocket
        upgrade or as a Bearer token on REST endpoints.

    Returns
    -------
    AuthenticatedUser
        The authenticated user's UUID and display name.

    Raises
    ------
    HTTPException
        401 if the token is invalid, expired, or missing required claims.
    """
    settings = get_settings()
    try:
        payload: dict = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    # Extract display name from user_metadata or email
    user_metadata = payload.get("user_metadata", {})
    display_name = (
        user_metadata.get("display_name")
        or payload.get("email", "Unknown")
    )

    return AuthenticatedUser(user_id=user_id, display_name=display_name)
