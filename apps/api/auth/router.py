"""
Authentication router with all endpoints
"""

from datetime import datetime, timezone
from typing import Literal, Mapping, Optional, Sequence, cast
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Request

from .models import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    OTPRequest, OTPVerify, PasswordChange, OAuthCallback, TokenRefresh
)
from .jwt_handler import (
    create_access_token, create_refresh_token, 
    verify_refresh_token, revoke_refresh_token, rotate_refresh_token
)
from .password import verify_password, get_password_hash
from .dependencies import AuthenticatedUser, get_current_active_user
from .rate_limiter import (
    login_rate_limit, otp_request_rate_limit, registration_rate_limit,
    get_client_ip
)
from .otp_providers import EmailOTPProvider, SMSOTPProvider, WhatsAppOTPProvider
from .oauth_providers import GoogleOAuthProvider, GitHubOAuthProvider
from apps.api.db_types import Database, DocumentDict

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _optional_str(value: object) -> Optional[str]:
    """Convert retrieved document values into optional strings."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return str(value)


def _ensure_object_id(value: object) -> ObjectId:
    """Safely cast a document identifier to ObjectId."""
    if isinstance(value, ObjectId):
        return value
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Database document is missing a valid identifier"
    )


def _cast_document(value: object | None) -> Optional[DocumentDict]:
    """Cast Motor query results into a concrete document mapping."""
    if value is None:
        return None
    if isinstance(value, dict):
        return cast(DocumentDict, value)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unexpected database document shape"
    )


def _ensure_document(value: object | None, not_found: HTTPException) -> DocumentDict:
    """Ensure a document exists or raise the provided exception."""
    document = _cast_document(value)
    if document is None:
        raise not_found
    return document


def _optional_datetime(value: object) -> Optional[datetime]:
    """Convert optional values to datetimes when present."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Expected datetime in database document"
    )


def _require_datetime(value: object, field: str) -> datetime:
    """Ensure a datetime value exists in a document."""
    dt = _optional_datetime(value)
    if dt is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Missing required timestamp '{field}'"
        )
    return dt


def _build_token_payload(user_id: str, user: Mapping[str, object]) -> dict[str, object]:
    """Construct the JWT payload from a stored user document."""
    return {
        "sub": user_id,
        "email": _optional_str(user.get("email")),
        "role": _optional_str(user.get("role")) or "USER",
        "username": _optional_str(user.get("username"))
    }


def _request_device_info(request: Request) -> dict[str, object]:
    """Capture lightweight request metadata for refresh tokens."""
    return {
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("User-Agent")
    }


async def _issue_tokens(
    user_id: str,
    user: Mapping[str, object],
    request: Request,
    db: Database
) -> TokenResponse:
    """Create access and refresh tokens for the given user."""
    access_token = create_access_token(_build_token_payload(user_id, user))
    refresh_token = await create_refresh_token(
        user_id,
        db,
        device_info=_request_device_info(request)
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900
    )


async def get_db() -> Database:
    """Get database instance"""
    from main import db
    return cast(Database, db)


async def log_auth_event(
    db: Database,
    user_id: Optional[str],
    event_type: str,
    method: str,
    success: bool,
    request: Request,
    metadata: Optional[Mapping[str, object]] = None
) -> None:
    """Log authentication event for audit trail"""
    await db.auth_events.insert_one({
        "user_id": user_id,
        "event_type": event_type,
        "method": method,
        "success": success,
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("User-Agent"),
        "metadata": dict(metadata) if metadata else {},
        "created_at": datetime.now(timezone.utc)
    })


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Register a new user with multiple authentication methods.
    
    Supported methods:
    - password: Email/phone + password
    - google: Google OAuth (use /oauth/google/authorize first)
    - github: GitHub OAuth (use /oauth/github/authorize first)
    - email_otp: Email OTP verification
    - sms_otp: SMS OTP verification
    - whatsapp_otp: WhatsApp OTP verification
    """
    # Rate limiting
    await registration_rate_limit(request)
    
    # Check if user already exists
    existing_user: Optional[DocumentDict] = None
    if user_data.email:
        existing_user = _cast_document(await db.users.find_one({"email": user_data.email}))
    if not existing_user and user_data.phone:
        existing_user = _cast_document(await db.users.find_one({"phone": user_data.phone}))
    if not existing_user and user_data.username:
        existing_user = _cast_document(await db.users.find_one({"username": user_data.username}))
    
    if existing_user:
        await log_auth_event(
            db, None, "registration_failed", user_data.auth_method,
            False, request, {"reason": "user_exists"}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email, phone, or username already exists"
        )
    
    # Create user document
    user_doc: DocumentDict = {
        "email": user_data.email,
        "phone": user_data.phone,
        "username": user_data.username,
        "full_name": user_data.full_name,
        "role": "USER",  # Default role
        "status": "active",
        "email_verified": False,
        "phone_verified": False,
        "auth_method": user_data.auth_method,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    # Handle password-based registration
    if user_data.auth_method == "password":
        if not user_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required for password-based registration"
            )
        user_doc["hashed_password"] = get_password_hash(user_data.password)
    
    # Insert user
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Log successful registration
    await log_auth_event(
        db, user_id, "registration_success", user_data.auth_method,
        True, request
    )
    
    return await _issue_tokens(user_id, user_doc, request, db)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Login with email/phone/username and password.
    """
    # Rate limiting
    await login_rate_limit(request, credentials.identifier)
    
    # Find user by identifier (email, phone, or username)
    user = _cast_document(await db.users.find_one({
        "$or": [
            {"email": credentials.identifier},
            {"phone": credentials.identifier},
            {"username": credentials.identifier}
        ]
    }))
    
    if user is None:
        await log_auth_event(
            db, None, "login_failed", "password",
            False, request, {"reason": "user_not_found"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    raw_user_id = user.get("_id")
    if raw_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User record missing identifier"
        )
    user_id = str(raw_user_id)
    
    # Verify password
    hashed_password = _optional_str(user.get("hashed_password"))
    if hashed_password is None:
        await log_auth_event(
            db, user_id, "login_failed", "password",
            False, request, {"reason": "no_password_set"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not enabled for this account"
        )
    
    if not verify_password(credentials.password, hashed_password):
        await log_auth_event(
            db, user_id, "login_failed", "password",
            False, request, {"reason": "invalid_password"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check user status
    status_value = _optional_str(user.get("status"))
    if status_value != "active":
        await log_auth_event(
            db, user_id, "login_failed", "password",
            False, request, {"reason": f"user_{status_value}"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {status_value}"
        )
    
    # Update last login
    await db.users.update_one(
        {"_id": raw_user_id},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Log successful login
    await log_auth_event(
        db, user_id, "login_success", "password",
        True, request
    )
    
    return await _issue_tokens(user_id, user, request, db)


@router.post("/otp/request")
async def request_otp(
    otp_request: OTPRequest,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Request OTP via email, SMS, or WhatsApp.
    """
    # Rate limiting
    await otp_request_rate_limit(request, otp_request.identifier)
    
    # Send OTP based on method
    try:
        if otp_request.method == "email":
            provider = EmailOTPProvider(db)
            await provider.send_otp(otp_request.identifier, otp_request.purpose)
        elif otp_request.method == "sms":
            provider = SMSOTPProvider(db)
            await provider.send_otp(otp_request.identifier, otp_request.purpose)
        elif otp_request.method == "whatsapp":
            provider = WhatsAppOTPProvider(db)
            await provider.send_otp(otp_request.identifier, otp_request.purpose)
    except Exception as e:
        await log_auth_event(
            db, None, "otp_request_failed", otp_request.method,
            False, request, {"reason": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send OTP: {str(e)}"
        )
    
    # Log OTP request
    await log_auth_event(
        db, None, "otp_request_success", otp_request.method,
        True, request, {"identifier": otp_request.identifier}
    )
    
    return {"message": "OTP sent successfully", "expires_in": 600}


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    otp_data: OTPVerify,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Verify OTP and login/register user.
    """
    # Verify OTP
    provider = EmailOTPProvider(db)  # Base verification works for all types
    try:
        verified = await provider.verify_otp(
            otp_data.identifier,
            otp_data.code,
            otp_data.purpose
        )
    except HTTPException:
        await log_auth_event(
            db, None, "otp_verify_failed", "otp",
            False, request, {"identifier": otp_data.identifier}
        )
        raise
    
    if not verified:
        await log_auth_event(
            db, None, "otp_verify_failed", "otp",
            False, request, {"reason": "invalid_code"}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code"
        )
    
    # Find or create user
    is_email = "@" in otp_data.identifier
    query = {"email": otp_data.identifier} if is_email else {"phone": otp_data.identifier}
    user = await db.users.find_one(query)
    
    if not user:
        # Create new user for registration
        if otp_data.purpose != "registration":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. Please register first."
            )
        
        user_doc = {
            "email": otp_data.identifier if is_email else None,
            "phone": otp_data.identifier if not is_email else None,
            "role": "USER",
            "status": "active",
            "email_verified": is_email,
            "phone_verified": not is_email,
            "auth_method": "email_otp" if is_email else "sms_otp",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_login": datetime.now(timezone.utc)
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        await log_auth_event(
            db, user_id, "registration_success", "otp",
            True, request
        )
    else:
        user_id = str(user["_id"])
        
        # Update verification status and last login
        update_fields = {"last_login": datetime.now(timezone.utc)}
        if is_email:
            update_fields["email_verified"] = True
        else:
            update_fields["phone_verified"] = True
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": update_fields}
        )
        
        await log_auth_event(
            db, user_id, "login_success", "otp",
            True, request
        )
    
    # Create tokens
    user = await db.users.find_one({"_id": user["_id"]}) if user else await db.users.find_one({"_id": result.inserted_id})
    
    access_token = create_access_token({
        "sub": user_id,
        "email": user.get("email"),
        "role": user.get("role", "USER"),
        "username": user.get("username")
    })
    
    refresh_token = await create_refresh_token(
        user_id, db,
        device_info={
            "ip_address": get_client_ip(request),
            "user_agent": request.headers.get("User-Agent")
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900
    )


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(
    provider: Literal["google", "github"],
    db: Database = Depends(get_db)
):
    """
    Get OAuth authorization URL for the specified provider.
    """
    if provider == "google":
        oauth_provider = GoogleOAuthProvider(db)
    elif provider == "github":
        oauth_provider = GitHubOAuthProvider(db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    auth_url = oauth_provider.get_authorization_url()
    return {"authorization_url": auth_url}


@router.get("/oauth/{provider}/callback", response_model=TokenResponse)
async def oauth_callback(
    provider: Literal["google", "github"],
    code: str,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Handle OAuth callback and login/register user.
    """
    if provider == "google":
        oauth_provider = GoogleOAuthProvider(db)
    elif provider == "github":
        oauth_provider = GitHubOAuthProvider(db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    try:
        user_info = await oauth_provider.exchange_code(code)
    except HTTPException:
        await log_auth_event(
            db, None, "oauth_failed", provider,
            False, request, {"reason": "code_exchange_failed"}
        )
        raise
    
    # Find or create user
    existing_user_id = await oauth_provider.find_linked_account(
        provider, user_info["provider_user_id"]
    )
    
    if existing_user_id:
        # Existing user - login
        user = await db.users.find_one({"_id": existing_user_id})
        user_id = str(user["_id"])
        
        # Update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        await log_auth_event(
            db, user_id, "login_success", f"oauth_{provider}",
            True, request
        )
    else:
        # New user - register
        # Check if email already exists
        email_user = await db.users.find_one({"email": user_info["email"]})
        
        if email_user:
            # Link OAuth to existing user
            user_id = str(email_user["_id"])
            await oauth_provider.link_account(
                user_id, provider, user_info["provider_user_id"],
                user_info, user_info["tokens"]
            )
            
            await log_auth_event(
                db, user_id, "oauth_linked", f"oauth_{provider}",
                True, request
            )
        else:
            # Create new user
            user_doc = {
                "email": user_info["email"],
                "full_name": user_info.get("name"),
                "username": user_info.get("username"),
                "role": "USER",
                "status": "active",
                "email_verified": user_info.get("email_verified", False),
                "phone_verified": False,
                "auth_method": f"oauth_{provider}",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "last_login": datetime.now(timezone.utc)
            }
            result = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            # Link OAuth account
            await oauth_provider.link_account(
                user_id, provider, user_info["provider_user_id"],
                user_info, user_info["tokens"]
            )
            
            await log_auth_event(
                db, user_id, "registration_success", f"oauth_{provider}",
                True, request
            )
    
    # Get updated user
    user = await db.users.find_one({"_id": user["_id"] if existing_user_id else result.inserted_id})
    
    # Create tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": user.get("email"),
        "role": user.get("role", "USER"),
        "username": user.get("username")
    })
    
    refresh_token = await create_refresh_token(
        user_id, db,
        device_info={
            "ip_address": get_client_ip(request),
            "user_agent": request.headers.get("User-Agent")
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    token_data: TokenRefresh,
    request: Request,
    db: Database = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    # Verify refresh token
    user_id = await verify_refresh_token(token_data.refresh_token, db)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Get user
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Rotate refresh token
    new_refresh_token = await rotate_refresh_token(
        token_data.refresh_token, db,
        device_info={
            "ip_address": get_client_ip(request),
            "user_agent": request.headers.get("User-Agent")
        }
    )
    
    if not new_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to rotate refresh token"
        )
    
    # Create new access token
    access_token = create_access_token({
        "sub": str(user["_id"]),
        "email": user.get("email"),
        "role": user.get("role", "USER"),
        "username": user.get("username")
    })
    
    await log_auth_event(
        db, str(user["_id"]), "token_refresh", "refresh_token",
        True, request
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=900
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """
    Get current authenticated user information.
    """
    from bson import ObjectId
    
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        phone=user.get("phone"),
        username=user.get("username"),
        full_name=user.get("full_name"),
        role=user.get("role", "USER"),
        status=user.get("status", "active"),
        email_verified=user.get("email_verified", False),
        phone_verified=user.get("phone_verified", False),
        created_at=user.get("created_at"),
        last_login=user.get("last_login")
    )


@router.post("/logout")
async def logout(
    token_data: TokenRefresh,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """
    Logout user by revoking refresh token.
    """
    # Revoke refresh token
    revoked = await revoke_refresh_token(token_data.refresh_token, db)
    
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token not found or already revoked"
        )
    
    await log_auth_event(
        db, current_user["id"], "logout", "manual",
        True, request
    )
    
    return {"message": "Logged out successfully"}


@router.post("/password/change")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """
    Change user password.
    """
    from bson import ObjectId
    
    # Get user
    user = _cast_document(await db.users.find_one({"_id": ObjectId(current_user["id"])}))
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify old password
    hashed_password = _optional_str(user.get("hashed_password"))
    if hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled for this account"
        )
    
    if not verify_password(password_data.old_password, hashed_password):
        await log_auth_event(
            db, current_user["id"], "password_change_failed", "password",
            False, request, {"reason": "invalid_old_password"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect old password"
        )
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "hashed_password": new_hashed_password,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    await log_auth_event(
        db, current_user["id"], "password_change_success", "password",
        True, request
    )
    
    return {"message": "Password changed successfully"}
