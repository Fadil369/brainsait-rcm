"""
Standardized Error Handling Utilities
Provides consistent error responses across all API endpoints.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


class APIError(HTTPException):
    """
    Base API error class with standardized structure.
    All custom errors should inherit from this.
    """
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": message,
                "details": self.details
            }
        )


# ============================================================================
# Specific Error Classes
# ============================================================================

class ResourceNotFoundError(APIError):
    """Raised when a requested resource doesn't exist."""
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            message=f"{resource_type} not found",
            details={"resource_type": resource_type, "resource_id": resource_id}
        )


class UnauthorizedError(APIError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
            message=message,
            details={"hint": "Please provide valid authentication credentials"}
        )


class ForbiddenError(APIError):
    """Raised when user lacks permission for the requested action."""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
            message=message,
            details={"hint": "You don't have permission to perform this action"}
        )


class ValidationError(APIError):
    """Raised when input validation fails."""
    
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message=f"Validation failed for field: {field}",
            details={"field": field, "reason": message}
        )


class ConflictError(APIError):
    """Raised when resource already exists or conflicts with existing data."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message=message,
            details=details or {}
        )


class ServiceUnavailableError(APIError):
    """Raised when an external service is unavailable."""
    
    def __init__(self, service_name: str, message: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            message=message or f"{service_name} is currently unavailable",
            details={"service": service_name}
        )


class DatabaseError(APIError):
    """Raised when database operations fail."""
    
    def __init__(self, operation: str, message: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            message=message or f"Database operation failed: {operation}",
            details={"operation": operation}
        )


# ============================================================================
# Error Handlers
# ============================================================================

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """
    Handler for custom APIError exceptions.
    Returns standardized JSON error response.
    """
    logger.error(
        f"API Error: {exc.error_code} - {exc.detail}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )


async def validation_error_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """
    Handler for Pydantic validation errors.
    Provides detailed field-level error information.
    """
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"Validation Error: {len(errors)} field(s) failed validation",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {"errors": errors}
        }
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for uncaught exceptions.
    Logs full stack trace and returns generic error message.
    """
    logger.exception(
        f"Unhandled exception: {type(exc).__name__}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__
        }
    )
    
    # Don't expose internal error details in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": {}
        }
    )


# ============================================================================
# Error Handler Registration
# ============================================================================

def register_error_handlers(app):
    """
    Register all error handlers with the FastAPI application.
    
    Usage:
        from utils.error_handler import register_error_handlers
        
        app = FastAPI()
        register_error_handlers(app)
    """
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)
    
    logger.info("✅ Error handlers registered successfully")


# ============================================================================
# Utility Functions
# ============================================================================

def ensure_database_available(db_client) -> None:
    """
    Check if database is available, raise ServiceUnavailableError if not.
    
    Usage:
        ensure_database_available(db_client)
    """
    if db_client is None:
        raise ServiceUnavailableError(
            service_name="MongoDB",
            message="Database connection is not available. Please configure DATABASE_URL."
        )


def ensure_authenticated(user) -> None:
    """
    Check if user is authenticated, raise UnauthorizedError if not.
    
    Usage:
        ensure_authenticated(current_user)
    """
    if user is None:
        raise UnauthorizedError()


def ensure_authorized(user, required_role: str) -> None:
    """
    Check if user has required role, raise ForbiddenError if not.
    
    Usage:
        ensure_authorized(current_user, "admin")
    """
    if not user:
        raise UnauthorizedError()
    
    if user.get("role") != required_role:
        raise ForbiddenError(
            message=f"This action requires '{required_role}' role"
        )
