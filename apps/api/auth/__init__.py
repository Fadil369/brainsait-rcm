"""
BrainSAIT RCM - Authentication Module
Multi-method authentication with OAuth, OTP, and password-based auth
"""

from .jwt_handler import create_access_token, create_refresh_token, decode_access_token, revoke_refresh_token
from .models import UserCreate, UserLogin, TokenResponse, UserResponse, OTPRequest, OTPVerify
from .dependencies import get_current_user, get_current_active_user, require_super_admin
from .password import verify_password, get_password_hash
from .router import router as auth_router

__all__ = [
    'create_access_token',
    'create_refresh_token',
    'decode_access_token',
    'revoke_refresh_token',
    'UserCreate',
    'UserLogin',
    'TokenResponse',
    'UserResponse',
    'OTPRequest',
    'OTPVerify',
    'get_current_user',
    'get_current_active_user',
    'require_super_admin',
    'verify_password',
    'get_password_hash',
    'auth_router',
]
