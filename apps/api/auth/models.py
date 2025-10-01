"""
Pydantic models for authentication
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserBase(BaseModel):
    """Base user model"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+[1-9]\d{1,14}$')
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError(
                'Username must contain only alphanumeric characters, '
                'underscores, and hyphens'
            )
        return v


class UserCreate(UserBase):
    """User registration model"""
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    auth_method: Literal['password', 'google', 'github', 'email_otp', 'sms_otp', 'whatsapp_otp']
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v, info):
        if info.data.get('auth_method') == 'password' and not v:
            raise ValueError('Password is required for password-based registration')
        if v:
            # OWASP password guidelines
            if len(v) < 8:
                raise ValueError('Password must be at least 8 characters long')
            if not re.search(r'[A-Z]', v):
                raise ValueError('Password must contain at least one uppercase letter')
            if not re.search(r'[a-z]', v):
                raise ValueError('Password must contain at least one lowercase letter')
            if not re.search(r'\d', v):
                raise ValueError('Password must contain at least one digit')
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
                raise ValueError('Password must contain at least one special character')
        return v


class UserLogin(BaseModel):
    """User login model"""
    identifier: str = Field(..., description="Email, phone, or username")
    password: str = Field(..., min_length=8, max_length=100)


class OTPRequest(BaseModel):
    """OTP request model"""
    identifier: str = Field(..., description="Email or phone number")
    method: Literal['email', 'sms', 'whatsapp']
    purpose: Literal['login', 'registration', 'verification'] = 'login'


class OTPVerify(BaseModel):
    """OTP verification model"""
    identifier: str = Field(..., description="Email or phone number")
    code: str = Field(..., pattern=r'^\d{6}$')
    purpose: Literal['login', 'registration', 'verification'] = 'login'


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes in seconds


class TokenRefresh(BaseModel):
    """Token refresh request"""
    refresh_token: str


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    status: str
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    """Password change model"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        # OWASP password guidelines
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class OAuthCallback(BaseModel):
    """OAuth callback model"""
    code: str
    state: Optional[str] = None


class SuperAdminInitialize(BaseModel):
    """Super admin initialization model"""
    setup_key: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., max_length=100)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        # OWASP password guidelines
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
