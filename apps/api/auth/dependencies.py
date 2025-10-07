"""
FastAPI dependencies for authentication and authorization
"""

from typing import TypedDict, cast
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt_handler import decode_access_token


security = HTTPBearer()


class AuthenticatedUser(TypedDict):
    """Authenticated user information extracted from JWT."""

    id: str
    email: str | None
    role: str | None
    username: str | None


def _optional_str(value: object) -> str | None:
    """Normalize arbitrary values to optional strings for token payloads."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return str(value)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    """
    Get current user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        dict: User data from token
        
    Raises:
        HTTPException: If token is invalid
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    return {
        "id": cast(str, user_id),
        "email": _optional_str(payload.get("email")),
        "role": _optional_str(payload.get("role")),
        "username": _optional_str(payload.get("username"))
    }


async def get_current_active_user(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Get current active user (additional validation can be added).
    
    Args:
        current_user: User from get_current_user
        
    Returns:
        dict: Active user data
    """
    # Can add additional checks here (e.g., check if user is disabled)
    return current_user


class RoleChecker:
    """Dependency for role-based access control"""
    
    def __init__(self, allowed_roles: list[str]):
        """
        Initialize role checker.
        
        Args:
            allowed_roles: List of allowed roles
        """
        self.allowed_roles = allowed_roles
    
    def __call__(
        self,
        current_user: AuthenticatedUser = Depends(get_current_user)
    ) -> AuthenticatedUser:
        """
        Check if user has required role.
        
        Args:
            current_user: User from get_current_user
            
        Returns:
            dict: User data if authorized
            
        Raises:
            HTTPException: If user doesn't have required role
        """
        user_role = current_user.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User with role '{user_role}' is not authorized to access this resource"
            )
        return current_user


# Role-based dependencies
require_super_admin = RoleChecker(["SUPER_ADMIN"])
require_admin = RoleChecker(["SUPER_ADMIN", "ADMIN"])
require_manager = RoleChecker(["SUPER_ADMIN", "ADMIN", "MANAGER"])
require_analyst = RoleChecker(["SUPER_ADMIN", "ADMIN", "MANAGER", "ANALYST"])
