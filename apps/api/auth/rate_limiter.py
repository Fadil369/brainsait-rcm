"""
Rate limiting middleware for authentication endpoints
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status, Request


class RateLimiter:
    """Rate limiter using MongoDB"""
    
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        max_requests: int,
        window_minutes: int,
        identifier_key: str = "ip"
    ):
        """
        Initialize rate limiter.
        
        Args:
            db: Database connection
            max_requests: Maximum requests allowed in window
            window_minutes: Time window in minutes
            identifier_key: Key to use for identification (ip, email, phone)
        """
        self.db = db
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        self.identifier_key = identifier_key
    
    async def check_rate_limit(
        self,
        identifier: str,
        endpoint: str
    ) -> bool:
        """
        Check if rate limit is exceeded.
        
        Args:
            identifier: IP address, email, or phone
            endpoint: API endpoint name
            
        Returns:
            bool: True if within limit, False if exceeded
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=self.window_minutes)
        
        # Check current count in window
        rate_limit_doc = await self.db.rate_limits.find_one({
            "identifier": identifier,
            "endpoint": endpoint,
            "window_start": {"$gte": window_start}
        })
        
        if rate_limit_doc:
            if rate_limit_doc["count"] >= self.max_requests:
                retry_after = int(
                    (rate_limit_doc["window_start"] + 
                     timedelta(minutes=self.window_minutes) - now)
                    .total_seconds()
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after} seconds",
                    headers={"Retry-After": str(retry_after)}
                )
            
            # Increment count
            await self.db.rate_limits.update_one(
                {"_id": rate_limit_doc["_id"]},
                {"$inc": {"count": 1}}
            )
        else:
            # Create new rate limit entry
            await self.db.rate_limits.insert_one({
                "identifier": identifier,
                "endpoint": endpoint,
                "count": 1,
                "window_start": now,
                "expires_at": now + timedelta(minutes=self.window_minutes + 5)
            })
        
        return True


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Args:
        request: FastAPI request
        
    Returns:
        str: Client IP address
    """
    # Check for forwarded IP (proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"


async def login_rate_limit(
    request: Request,
    identifier: Optional[str] = None
) -> None:
    """
    Rate limiter for login endpoints: 5 requests per 15 minutes.
    
    Args:
        request: FastAPI request
        identifier: Email, phone, or username (if available)
    """
    from main import db  # Import here to avoid circular dependency
    
    # Use identifier if provided, otherwise use IP
    limit_key = identifier if identifier else get_client_ip(request)
    
    limiter = RateLimiter(
        db=db,
        max_requests=5,
        window_minutes=15,
        identifier_key="identifier"
    )
    
    await limiter.check_rate_limit(limit_key, "login")


async def otp_request_rate_limit(
    request: Request,
    identifier: str
) -> None:
    """
    Rate limiter for OTP request endpoints: 1 per minute, 5 per hour.
    
    Args:
        request: FastAPI request
        identifier: Email or phone number
    """
    from main import db  # Import here to avoid circular dependency
    
    # Check 1 per minute
    limiter_minute = RateLimiter(
        db=db,
        max_requests=1,
        window_minutes=1,
        identifier_key="identifier"
    )
    
    await limiter_minute.check_rate_limit(identifier, "otp_request_minute")
    
    # Check 5 per hour
    limiter_hour = RateLimiter(
        db=db,
        max_requests=5,
        window_minutes=60,
        identifier_key="identifier"
    )
    
    await limiter_hour.check_rate_limit(identifier, "otp_request_hour")


async def registration_rate_limit(request: Request) -> None:
    """
    Rate limiter for registration endpoints: 3 per hour per IP.
    
    Args:
        request: FastAPI request
    """
    from main import db  # Import here to avoid circular dependency
    
    client_ip = get_client_ip(request)
    
    limiter = RateLimiter(
        db=db,
        max_requests=3,
        window_minutes=60,
        identifier_key="ip"
    )
    
    await limiter.check_rate_limit(client_ip, "registration")
