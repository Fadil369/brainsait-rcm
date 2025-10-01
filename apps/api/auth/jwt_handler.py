"""
JWT token handling with access and refresh tokens
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os
import hashlib
import secrets
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status


# Configuration from environment
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET_KEY must be set in environment variables. "
        "This is a security requirement."
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a new JWT access token.
    
    Args:
        data: Dictionary containing user claims (sub, role, etc.)
        expires_delta: Optional custom expiration time
        
    Returns:
        str: Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def create_refresh_token(
    user_id: str,
    db: AsyncIOMotorDatabase,
    device_info: Optional[Dict[str, Any]] = None
) -> str:
    """
    Create a new refresh token and store it in the database.
    
    Args:
        user_id: User ID
        db: Database connection
        device_info: Optional device information (user_agent, ip_address)
        
    Returns:
        str: Refresh token
    """
    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Store token hash in database
    refresh_token_doc = {
        "user_id": user_id,
        "token_hash": token_hash,
        "device_info": device_info or {},
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        ),
        "revoked": False
    }
    
    await db.refresh_tokens.insert_one(refresh_token_doc)
    
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Dict containing token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Check expiration
        exp = payload.get("exp")
        if not exp or datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        
        return payload
    
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )


async def verify_refresh_token(
    token: str,
    db: AsyncIOMotorDatabase
) -> Optional[str]:
    """
    Verify a refresh token and return the associated user_id.
    
    Args:
        token: Refresh token
        db: Database connection
        
    Returns:
        str: User ID if token is valid, None otherwise
    """
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Find token in database
    token_doc = await db.refresh_tokens.find_one({
        "token_hash": token_hash,
        "revoked": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not token_doc:
        return None
    
    return token_doc["user_id"]


async def revoke_refresh_token(
    token: str,
    db: AsyncIOMotorDatabase
) -> bool:
    """
    Revoke a refresh token.
    
    Args:
        token: Refresh token to revoke
        db: Database connection
        
    Returns:
        bool: True if token was revoked, False if not found
    """
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    result = await db.refresh_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}}
    )
    
    return result.modified_count > 0


async def rotate_refresh_token(
    old_token: str,
    db: AsyncIOMotorDatabase,
    device_info: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Rotate a refresh token (revoke old, create new).
    
    Args:
        old_token: Old refresh token
        db: Database connection
        device_info: Optional device information
        
    Returns:
        str: New refresh token if rotation successful, None otherwise
    """
    # Verify and get user_id from old token
    user_id = await verify_refresh_token(old_token, db)
    
    if not user_id:
        return None
    
    # Revoke old token
    await revoke_refresh_token(old_token, db)
    
    # Create new token
    new_token = await create_refresh_token(user_id, db, device_info)
    
    return new_token
