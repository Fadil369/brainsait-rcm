"""
Security middleware for input validation and rate limiting.
Implements best practices for API security.
"""
import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

# Rate limiting storage (in-memory, use Redis in production)
_rate_limit_storage: Dict[str, list] = defaultdict(list)
_request_size_limit = 10_000_000  # 10MB


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware that implements:
    - Content-Type validation for POST/PUT/PATCH requests
    - Request size limits to prevent DoS attacks
    - Basic rate limiting (IP-based)
    """

    def __init__(self, app, rate_limit: int = 100, rate_window: int = 60):
        """
        Initialize security middleware.
        
        Args:
            app: FastAPI application
            rate_limit: Maximum requests per window (default: 100)
            rate_window: Time window in seconds (default: 60)
        """
        super().__init__(app)
        self.rate_limit = rate_limit
        self.rate_window = rate_window

    async def dispatch(self, request: Request, call_next):
        try:
            # 1. Validate Content-Type for mutating requests
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("content-type", "")
                # Allow application/json and multipart/form-data
                if not (content_type.startswith("application/json") or 
                        content_type.startswith("multipart/form-data")):
                    return JSONResponse(
                        status_code=415,
                        content={
                            "error": "Unsupported Media Type",
                            "detail": "Content-Type must be application/json or multipart/form-data"
                        }
                    )

            # 2. Validate request size to prevent DoS
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > _request_size_limit:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": "Payload Too Large",
                        "detail": f"Request body exceeds {_request_size_limit / 1_000_000}MB limit"
                    }
                )

            # 3. Rate limiting (IP-based)
            client_ip = self._get_client_ip(request)
            if not self._check_rate_limit(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "detail": f"Rate limit exceeded. Maximum {self.rate_limit} requests per {self.rate_window} seconds."
                    }
                )

            # 4. Add security headers to response
            response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

            return response

        except Exception as exc:
            logger.error(f"Security middleware error: {exc}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "detail": "An error occurred processing your request"
                }
            )

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request, considering proxies."""
        # Check X-Forwarded-For header first (for proxied requests)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"

    def _check_rate_limit(self, client_ip: str) -> bool:
        """
        Check if client has exceeded rate limit.
        
        Returns:
            True if request is allowed, False if rate limit exceeded
        """
        current_time = time.time()
        
        # Clean old requests outside the time window
        _rate_limit_storage[client_ip] = [
            timestamp for timestamp in _rate_limit_storage[client_ip]
            if current_time - timestamp < self.rate_window
        ]
        
        # Check if limit exceeded
        if len(_rate_limit_storage[client_ip]) >= self.rate_limit:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return False
        
        # Add current request
        _rate_limit_storage[client_ip].append(current_time)
        return True


def create_security_middleware(
    rate_limit: int = 100,
    rate_window: int = 60
) -> SecurityMiddleware:
    """
    Factory function to create security middleware with custom settings.
    
    Args:
        rate_limit: Maximum requests per window (default: 100 req/min)
        rate_window: Time window in seconds (default: 60s)
    
    Returns:
        Configured SecurityMiddleware instance
    """
    return lambda app: SecurityMiddleware(app, rate_limit=rate_limit, rate_window=rate_window)
