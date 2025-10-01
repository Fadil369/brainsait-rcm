"""
Authentication router with all endpoints
"""

from datetime import datetime, timezone
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from .models import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    OTPRequest, OTPVerify, PasswordChange, OAuthCallback, TokenRefresh
)
from .jwt_handler import (
    create_access_token, create_refresh_token, 
    verify_refresh_token, revoke_refresh_token, rotate_refresh_token
)
from .password import verify_password, get_password_hash
from .dependencies import get_current_user, get_current_active_user
from .rate_limiter import (
    login_rate_limit, otp_request_rate_limit, registration_rate_limit,
    get_client_ip
)
from .otp_providers import EmailOTPProvider, SMSOTPProvider, WhatsAppOTPProvider
from .oauth_providers import GoogleOAuthProvider, GitHubOAuthProvider

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance"""
    from main import db
    return db


async def log_auth_event(
    db: AsyncIOMotorDatabase,
    user_id: Optional[str],
    event_type: str,
    method: str,
    success: bool,
    request: Request,
    metadata: Optional[dict] = None
):
    """Log authentication event for audit trail"""
    await db.auth_events.insert_one({
        "user_id": user_id,
        "event_type": event_type,
        "method": method,
        "success": success,
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("User-Agent"),
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc)
    })


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    existing_user = None
    if user_data.email:
        existing_user = await db.users.find_one({"email": user_data.email})
    if not existing_user and user_data.phone:
        existing_user = await db.users.find_one({"phone": user_data.phone})
    if not existing_user and user_data.username:
        existing_user = await db.users.find_one({"username": user_data.username})
    
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
    user_doc = {
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
    
    # Create tokens
    access_token = create_access_token({
        "sub": user_id,
        "email": user_data.email,
        "role": "USER",
        "username": user_data.username
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
        expires_in=900  # 15 minutes
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Login with email/phone/username and password.
    """
    # Rate limiting
    await login_rate_limit(request, credentials.identifier)
    
    # Find user by identifier (email, phone, or username)
    user = await db.users.find_one({
        "$or": [
            {"email": credentials.identifier},
            {"phone": credentials.identifier},
            {"username": credentials.identifier}
        ]
    })
    
    if not user:
        await log_auth_event(
            db, None, "login_failed", "password",
            False, request, {"reason": "user_not_found"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Verify password
    if not user.get("hashed_password"):
        await log_auth_event(
            db, str(user["_id"]), "login_failed", "password",
            False, request, {"reason": "no_password_set"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not enabled for this account"
        )
    
    if not verify_password(credentials.password, user["hashed_password"]):
        await log_auth_event(
            db, str(user["_id"]), "login_failed", "password",
            False, request, {"reason": "invalid_password"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check user status
    if user.get("status") != "active":
        await log_auth_event(
            db, str(user["_id"]), "login_failed", "password",
            False, request, {"reason": f"user_{user.get('status')}"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.get('status')}"
        )
    
    user_id = str(user["_id"])
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Log successful login
    await log_auth_event(
        db, user_id, "login_success", "password",
        True, request
    )
    
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


@router.post("/otp/request")
async def request_otp(
    otp_request: OTPRequest,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback and login/register user.
    """
    # Exchange code for user info
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Change user password.
    """
    from bson import ObjectId
    
    # Get user
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify old password
    if not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled for this account"
        )
    
    if not verify_password(password_data.old_password, user["hashed_password"]):
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
