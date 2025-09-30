"""
BrainSAIT: Monitoring & Error Tracking
Sentry integration for error tracking
Prometheus metrics for monitoring
"""

import logging
import os
from functools import wraps
from time import time

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response

logger = logging.getLogger(__name__)

# ============================================================================
# SENTRY CONFIGURATION
# ============================================================================

def init_sentry():
    """Initialize Sentry error tracking"""
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("NODE_ENV", "development")

    if sentry_dsn:
        sentry_logging = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        )

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(),
                sentry_logging
            ],
            traces_sample_rate=1.0 if environment == "development" else 0.1,
            profiles_sample_rate=0.1,
            send_default_pii=False,  # HIPAA compliance - don't send PII
            before_send=sanitize_event
        )
        logger.info("✅ Sentry error tracking initialized")
    else:
        logger.warning("Sentry DSN not configured. Error tracking disabled.")


def sanitize_event(event, hint):
    """
    Sanitize events before sending to Sentry
    Remove PHI and sensitive data for HIPAA compliance
    """
    # Remove sensitive fields
    sensitive_keys = [
        'password', 'api_key', 'token', 'secret',
        'ssn', 'national_id', 'patient_name', 'email',
        'phone', 'address', 'credit_card'
    ]

    def sanitize_dict(d):
        if not isinstance(d, dict):
            return d

        sanitized = {}
        for key, value in d.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [sanitize_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        return sanitized

    # Sanitize request data
    if 'request' in event:
        event['request'] = sanitize_dict(event['request'])

    # Sanitize extra data
    if 'extra' in event:
        event['extra'] = sanitize_dict(event['extra'])

    return event


# ============================================================================
# PROMETHEUS METRICS
# ============================================================================

# HTTP Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'HTTP requests in progress',
    ['method', 'endpoint']
)

# Business metrics
rejections_created_total = Counter(
    'rejections_created_total',
    'Total rejections created'
)

appeals_created_total = Counter(
    'appeals_created_total',
    'Total appeals created'
)

fraud_alerts_total = Counter(
    'fraud_alerts_total',
    'Total fraud alerts generated',
    ['severity']
)

compliance_letters_sent_total = Counter(
    'compliance_letters_sent_total',
    'Total compliance letters sent',
    ['type']
)

nphies_submissions_total = Counter(
    'nphies_submissions_total',
    'Total NPHIES submissions',
    ['success']
)

# Database metrics
db_operations_total = Counter(
    'db_operations_total',
    'Total database operations',
    ['operation', 'collection']
)

db_operation_duration_seconds = Histogram(
    'db_operation_duration_seconds',
    'Database operation duration in seconds',
    ['operation', 'collection']
)

# System metrics
active_users_gauge = Gauge(
    'active_users',
    'Number of active users'
)

database_connection_status = Gauge(
    'database_connection_status',
    'Database connection status (1=connected, 0=disconnected)'
)


# ============================================================================
# MIDDLEWARE
# ============================================================================

async def metrics_middleware(request: Request, call_next):
    """Middleware to track HTTP metrics"""
    method = request.method
    endpoint = request.url.path

    # Track in-progress requests
    http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()

    # Track request duration
    start_time = time()

    try:
        response = await call_next(request)
        duration = time() - start_time

        # Record metrics
        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=response.status_code
        ).inc()

        http_request_duration_seconds.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

        return response

    except Exception as e:
        duration = time() - start_time

        # Record error metrics
        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=500
        ).inc()

        # Log to Sentry
        sentry_sdk.capture_exception(e)

        raise

    finally:
        http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()


def get_metrics_endpoint():
    """Prometheus metrics endpoint"""
    async def metrics():
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )
    return metrics


# ============================================================================
# DECORATORS
# ============================================================================

def track_db_operation(operation: str, collection: str):
    """Decorator to track database operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time()

            try:
                result = await func(*args, **kwargs)

                duration = time() - start_time
                db_operations_total.labels(
                    operation=operation,
                    collection=collection
                ).inc()

                db_operation_duration_seconds.labels(
                    operation=operation,
                    collection=collection
                ).observe(duration)

                return result

            except Exception as e:
                db_operations_total.labels(
                    operation=f"{operation}_error",
                    collection=collection
                ).inc()
                raise

        return wrapper
    return decorator


def track_business_metric(metric_name: str, **labels):
    """Decorator to track business metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)

                # Increment appropriate counter
                if metric_name == "rejection_created":
                    rejections_created_total.inc()
                elif metric_name == "appeal_created":
                    appeals_created_total.inc()
                elif metric_name == "fraud_alert":
                    fraud_alerts_total.labels(**labels).inc()
                elif metric_name == "compliance_letter":
                    compliance_letters_sent_total.labels(**labels).inc()
                elif metric_name == "nphies_submission":
                    nphies_submissions_total.labels(**labels).inc()

                return result

            except Exception as e:
                sentry_sdk.capture_exception(e)
                raise

        return wrapper
    return decorator


# ============================================================================
# HEALTH CHECK
# ============================================================================

class HealthStatus:
    """Health check status"""

    @staticmethod
    async def get_system_health(db_client) -> dict:
        """Get comprehensive system health"""
        health = {
            "status": "healthy",
            "timestamp": time(),
            "checks": {}
        }

        # Database check
        try:
            if db_client:
                await db_client.admin.command("ping")
                health["checks"]["database"] = {"status": "up"}
                database_connection_status.set(1)
            else:
                health["checks"]["database"] = {"status": "down"}
                database_connection_status.set(0)
                health["status"] = "degraded"
        except Exception as e:
            health["checks"]["database"] = {"status": "down", "error": str(e)}
            database_connection_status.set(0)
            health["status"] = "degraded"

        # Add more health checks as needed
        return health


# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

def configure_logging():
    """Configure structured logging"""
    log_level = os.getenv("LOG_LEVEL", "INFO")
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format
    )

    # Configure file handler if LOG_FILE is set
    log_file = os.getenv("LOG_FILE")
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter(log_format))
        logging.getLogger().addHandler(file_handler)


# ============================================================================
# INITIALIZATION
# ============================================================================

def init_monitoring():
    """Initialize all monitoring systems"""
    configure_logging()
    init_sentry()
    logger.info("✅ Monitoring systems initialized")