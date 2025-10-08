import logging
import os
import sys
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator
import jose
from jose import jwt, JWTError

# Add services to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services'))

load_dotenv()

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Initialize monitoring
try:
    from monitoring import init_monitoring, metrics_middleware, get_metrics_endpoint
    init_monitoring()
except ImportError:
    logger.warning("Monitoring module not available")

# Database client
db_client: Optional[AsyncIOMotorClient] = None


def _build_client_options() -> Dict[str, object]:
    """Safely construct MongoDB client options from the environment."""
    options: Dict[str, object] = {
        "serverSelectionTimeoutMS": int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000")),
        "maxPoolSize": int(os.getenv("MONGODB_MAX_POOL_SIZE", "50")),
        "minPoolSize": int(os.getenv("MONGODB_MIN_POOL_SIZE", "1")),
        "tz_aware": True,
    }

    if os.getenv("MONGODB_TLS", "false").lower() == "true":
        options["tls"] = True
        ca_file = os.getenv("MONGODB_TLS_CA_FILE")
        if ca_file:
            options["tlsCAFile"] = ca_file

    return options

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_client
    try:
        database_url = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
        if database_url == "mongodb://localhost:27017":
            logger.warning("Using fallback MongoDB URL; set DATABASE_URL for production deployments.")

        db_client = AsyncIOMotorClient(database_url, **_build_client_options())
        # Test connection
        await db_client.admin.command('ping')
        logger.info("✅ MongoDB connected successfully")
        
        # Create database indexes for authentication
        try:
            from utils.database import create_indexes
            await create_indexes(db_client.brainsait)
        except Exception as idx_exc:
            logger.warning("Failed to create indexes: %s", idx_exc)
            
    except Exception as exc:
        logger.error(
            "MongoDB connection failed: %s. Running without database.",
            exc,
            exc_info=exc,
        )
        logger.info(
            "Review apps/api/DB_TROUBLESHOOTING.md for recovery steps or configure DATABASE_URL to your Atlas cluster."
        )
        db_client = None
    yield
    # Shutdown
    if db_client:
        db_client.close()

app = FastAPI(
    title="BrainSAIT RCM API",
    description="Healthcare Claims Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# Include authentication routers
try:
    from auth.router import router as auth_router
    from admin.router import router as admin_router
    app.include_router(auth_router)
    app.include_router(admin_router)
    logger.info("✅ Authentication and admin routers loaded")
except Exception as router_exc:
    logger.warning("Failed to load auth routers: %s", router_exc)

# CORS middleware
raw_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
allow_credentials = os.getenv("ALLOW_CREDENTIALS", "false").lower() == "true"

if allow_credentials and "*" in raw_origins:
    raw_origins = [origin for origin in raw_origins if origin != "*"]
    logger.warning("Removed wildcard origin because credentials are enabled. Configure explicit origins via ALLOWED_ORIGINS.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=raw_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware (rate limiting, input validation)
try:
    from middleware import SecurityMiddleware
    app.add_middleware(
        SecurityMiddleware,
        rate_limit=int(os.getenv("RATE_LIMIT", "100")),
        rate_window=int(os.getenv("RATE_WINDOW", "60"))
    )
    logger.info("✅ Security middleware enabled")
except Exception as sec_exc:
    logger.warning("Failed to load security middleware: %s", sec_exc)

# Add monitoring middleware
try:
    app.middleware("http")(metrics_middleware)
except NameError:
    pass  # Monitoring not available

# Register standardized error handlers
try:
    from utils.error_handler import register_error_handlers
    register_error_handlers(app)
except Exception as err_exc:
    logger.warning("Failed to register error handlers: %s", err_exc)

# Database helper
def get_database():
    if db_client is None:
        raise HTTPException(status_code=503, detail="Database not available. Please start MongoDB.")
    return db_client.brainsait


def get_db_client() -> AsyncIOMotorClient:
    if db_client is None:
        raise HTTPException(status_code=503, detail="Database not available. Please start MongoDB.")
    return db_client

# Export db for auth modules
db = None
if db_client:
    db = db_client.brainsait

# Models
class RejectionRecord(BaseModel):
    id: str
    tpa_name: str
    insurance_company: str
    branch: str
    billed_amount: Dict[str, float]
    rejected_amount: Dict[str, float]
    rejection_received_date: datetime
    reception_mode: str
    initial_rejection_rate: float
    within_30_days: bool
    status: str
    audit_log: List[Dict[str, object]] = Field(default_factory=list)

    @field_validator('billed_amount', 'rejected_amount')
    @classmethod
    def ensure_amount_breakdown(cls, value: Dict[str, float]) -> Dict[str, float]:
        required_keys = {"net", "vat", "total"}
        missing = required_keys - set(value.keys())
        if missing:
            raise ValueError(f"Missing monetary breakdown fields: {', '.join(sorted(missing))}")
        return value

class ComplianceLetter(BaseModel):
    type: str
    recipient: str
    subject: Dict[str, str]
    body: Dict[str, str]
    due_date: Optional[datetime] = None
    days_overdue: Optional[int] = None
    total_amount: Optional[float] = None
    claim_references: List[str]
    audit_log: List[Dict[str, object]] = Field(default_factory=list)
    status: str = Field(default='pending')

    @field_validator('subject', 'body')
    @classmethod
    def ensure_bilingual_copy(cls, value: Dict[str, str]) -> Dict[str, str]:
        required_locales = {"ar", "en"}
        missing = required_locales - set(value.keys())
        if missing:
            raise ValueError(f"Missing locales in bilingual field: {', '.join(sorted(missing))}")
        return value

# Routes
@app.get("/")
async def root():
    return {
        "message": "BrainSAIT RCM API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    db_status = "disconnected"
    try:
        if db_client:
            await db_client.admin.command("ping")
            db_status = "connected"
    except Exception as exc:  # noqa: BLE001
        db_status = "error"
        logger.exception("Database health check failed", exc_info=exc)

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "api": "operational"
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    try:
        metrics_func = get_metrics_endpoint()
        return await metrics_func()
    except NameError:
        return {"error": "Metrics not available"}

@app.get("/api/rejections/current-month")
async def get_current_month_rejections(db = Depends(get_database)):
    """Get rejections for the current month"""
    try:
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        query = {"rejection_received_date": {"$gte": start_of_month}}
        rejections = await db.rejections.find(query).to_list(length=500)
        return jsonable_encoder(rejections)
    except Exception as exc:
        logger.exception("Failed to load current month rejections", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch rejections") from exc

@app.post("/api/rejections")
async def create_rejection(rejection: RejectionRecord, db = Depends(get_database)):
    """Create a new rejection record"""
    try:
        result = await db.rejections.insert_one(rejection.model_dump(mode='json'))
        return {"id": str(result.inserted_id), "status": "created"}
    except Exception as exc:
        logger.exception("Failed to create rejection record", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to create rejection") from exc

@app.get("/api/compliance/letters/pending")
async def get_pending_letters(db = Depends(get_database)):
    """Get pending compliance letters"""
    try:
        letters = await db.compliance_letters.find({"status": "pending"}).to_list(length=200)
        return jsonable_encoder(letters)
    except Exception as exc:
        logger.exception("Failed to load pending compliance letters", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch compliance letters") from exc

@app.post("/api/compliance/letters")
async def create_compliance_letter(letter: ComplianceLetter, db = Depends(get_database)):
    """Create a new compliance letter"""
    try:
        result = await db.compliance_letters.insert_one(letter.model_dump(mode='json'))
        return {"id": str(result.inserted_id), "status": "created"}
    except Exception as exc:
        logger.exception("Failed to create compliance letter", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to create compliance letter") from exc

# ============================================================================
# AI-POWERED ENDPOINTS
# ============================================================================

class FraudAnalysisRequest(BaseModel):
    claims: List[Dict[str, Any]]
    historical_data: Optional[List[Dict[str, Any]]] = None
    facility_schedules: Optional[Dict[str, Any]] = None

@app.post("/api/ai/fraud-detection")
async def analyze_fraud(request: FraudAnalysisRequest, db = Depends(get_database)):
    """Run AI-powered fraud detection on claims"""
    try:
        from fraud_detection.src.fraud_detector import run_fraud_detection

        results = run_fraud_detection(
            claims=request.claims,
            historical_data=request.historical_data,
            facility_schedules=request.facility_schedules
        )

        # Store fraud alerts in database
        if results['alerts']:
            await db.fraud_alerts.insert_many(results['alerts'])

        # Log audit entry
        await _audit_log(db, "fraud_analysis", "system", {
            "total_alerts": results['total_alerts'],
            "high_risk_physicians": len(results['high_risk_physicians'])
        })

        return results
    except ImportError as exc:
        logger.error(f"Fraud detection service not available: {exc}")
        raise HTTPException(status_code=503, detail="Fraud detection service unavailable") from exc
    except Exception as exc:
        logger.exception("Fraud detection failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Fraud analysis failed") from exc

class PredictiveAnalysisRequest(BaseModel):
    historical_data: List[Dict[str, Any]]
    forecast_days: int = 30

@app.post("/api/ai/predictive-analytics")
async def run_predictive_analytics(request: PredictiveAnalysisRequest, db = Depends(get_database)):
    """Run predictive analytics on historical rejection data"""
    try:
        from predictive_analytics.src.predictor import run_predictive_analysis

        results = run_predictive_analysis(
            historical_data=request.historical_data,
            forecast_days=request.forecast_days
        )

        # Store predictions in database
        await db.predictions.insert_one({
            "created_at": datetime.now(timezone.utc),
            "forecast_days": request.forecast_days,
            "results": results
        })

        await _audit_log(db, "predictive_analysis", "system", {
            "forecast_days": request.forecast_days
        })

        return results
    except ImportError as exc:
        logger.error(f"Predictive analytics service not available: {exc}")
        raise HTTPException(status_code=503, detail="Predictive analytics service unavailable") from exc
    except Exception as exc:
        logger.exception("Predictive analytics failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Predictive analysis failed") from exc

@app.get("/api/ai/physician-risk/{physician_id}")
async def get_physician_risk(physician_id: str, db = Depends(get_database)):
    """Get fraud risk assessment for a specific physician"""
    try:
        # Get physician's recent claims
        claims = await db.rejections.find({
            "physician_id": physician_id
        }).to_list(length=1000)

        # Get recent fraud alerts
        alerts = await db.fraud_alerts.find({
            "physician_id": physician_id
        }).to_list(length=500)

        from fraud_detection.src.fraud_detector import FraudDetector
        detector = FraudDetector()

        risk_assessment = detector.analyze_physician_risk(
            physician_id, claims, alerts
        )

        return risk_assessment
    except Exception as exc:
        logger.exception(f"Risk assessment failed for physician {physician_id}", exc_info=exc)
        raise HTTPException(status_code=500, detail="Risk assessment failed") from exc

# ============================================================================
# WHATSAPP NOTIFICATION ENDPOINTS
# ============================================================================

class NotificationRequest(BaseModel):
    to_number: str
    notification_type: str
    locale: str = "en"
    data: Dict[str, Any]

@app.post("/api/notifications/whatsapp")
async def send_whatsapp_notification(request: NotificationRequest, db = Depends(get_database)):
    """Send WhatsApp notification"""
    try:
        from whatsapp_notifications.src.whatsapp_service import send_notification

        result = await send_notification(
            notification_type=request.notification_type,
            locale=request.locale,
            to_number=request.to_number,
            **request.data
        )

        # Log notification
        await db.notification_log.insert_one({
            "sent_at": datetime.now(timezone.utc),
            "to_number": request.to_number,
            "type": request.notification_type,
            "success": result.get('success', False),
            "message_sid": result.get('message_sid')
        })

        return result
    except Exception as exc:
        logger.exception("WhatsApp notification failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Notification failed") from exc

# ============================================================================
# ANALYTICS & REPORTING ENDPOINTS
# ============================================================================

@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics(db = Depends(get_database)):
    """Get comprehensive dashboard analytics"""
    try:
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        window_start = now - timedelta(days=90)

        def _coerce_datetime(value: Any) -> Optional[datetime]:
            if isinstance(value, datetime):
                return value.astimezone(timezone.utc)
            if isinstance(value, str):
                try:
                    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    return None
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return parsed.astimezone(timezone.utc)
            return None

        def _numeric(value: Any) -> float:
            if isinstance(value, (int, float)):
                return float(value)
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        # Fetch last 90 days of rejections to power monthly metrics and sparkline series
        rejection_cursor = db.rejections.find({
            "rejection_received_date": {"$gte": window_start}
        })
        rejections = await rejection_cursor.to_list(length=5000)

        # Monthly slice for summary metrics
        monthly_rejections: List[Dict[str, Any]] = []
        rejection_received_index: Dict[int, datetime] = {}
        for index, record in enumerate(rejections):
            received_dt = _coerce_datetime(
                record.get('rejection_received_date') or record.get('rejectionReceivedDate')
            )
            if not received_dt:
                continue
            rejection_received_index[index] = received_dt
            if received_dt >= start_of_month:
                monthly_rejections.append(record)

        def _billed_total(record: Dict[str, Any]) -> float:
            billed = record.get('billed_amount') or record.get('billedAmount') or {}
            return _numeric(getattr(billed, 'get', lambda *_: 0)('total'))

        def _rejected_total(record: Dict[str, Any]) -> float:
            rejected = record.get('rejected_amount') or record.get('rejectedAmount') or {}
            return _numeric(getattr(rejected, 'get', lambda *_: 0)('total'))

        def _within_30(record: Dict[str, Any]) -> bool:
            return bool(
                record.get('within30Days')
                or record.get('within_30_days')
                or record.get('withinThirtyDays')
            )

        def _is_recovered(record: Dict[str, Any]) -> bool:
            if record.get('status') in {'RECOVERED', 'recovered', 'Resolved'}:
                return True
            if record.get('recoveredAmount') or record.get('recovered_amount'):
                return True
            return False

        total_billed = sum(_billed_total(r) for r in monthly_rejections)
        total_rejected = sum(_rejected_total(r) for r in monthly_rejections)
        rejection_rate = (total_rejected / total_billed * 100) if total_billed > 0 else 0.0
        recovery_rate = (
            sum(1 for r in monthly_rejections if _is_recovered(r)) / len(monthly_rejections) * 100
        ) if monthly_rejections else 0.0

        compliance_hits = sum(1 for r in monthly_rejections if _within_30(r))

        overdue = await db.compliance_letters.count_documents({
            "status": "pending",
            "due_date": {"$lt": now}
        })

        fraud_alerts = await db.fraud_alerts.find().sort("detected_at", -1).limit(30).to_list(length=30)

        # Build daily series for sparkline consumption
        daily_stats: Dict[datetime, Dict[str, Any]] = defaultdict(lambda: {
            "claims": 0,
            "recovered": 0,
            "within_30": 0,
            "rejected_total": 0.0,
        })

        for index, rejection in enumerate(rejections):
            received_at = rejection_received_index.get(index)
            if not received_at:
                received_at = _coerce_datetime(
                    rejection.get('rejection_received_date') or rejection.get('rejectionReceivedDate')
                )
                if received_at:
                    rejection_received_index[index] = received_at
            if not received_at:
                continue
            day_key = datetime(received_at.year, received_at.month, received_at.day, tzinfo=timezone.utc)
            bucket = daily_stats[day_key]
            bucket['claims'] += 1
            bucket['recovered'] += 1 if _is_recovered(rejection) else 0
            bucket['within_30'] += 1 if _within_30(rejection) else 0
            bucket['rejected_total'] += _rejected_total(rejection)

        alert_daily: Dict[datetime, int] = defaultdict(int)
        for alert in fraud_alerts:
            detected_at = _coerce_datetime(
                alert.get('detected_at')
                or alert.get('detectedAt')
                or alert.get('created_at')
                or alert.get('createdAt')
            )
            if not detected_at:
                continue
            day_key = datetime(detected_at.year, detected_at.month, detected_at.day, tzinfo=timezone.utc)
            alert_daily[day_key] += 1

        def _format_points(series_map: Dict[datetime, Any], transform) -> List[Dict[str, Any]]:
            points: List[Dict[str, Any]] = []
            for day in sorted(series_map.keys()):
                ts = int(day.timestamp()) * 1000
                value = transform(series_map[day])
                points.append({
                    "timestamp": day.isoformat(),
                    "ts": ts,
                    "value": value
                })
            return points

        claims_points = _format_points(daily_stats, lambda data: data['claims']) if daily_stats else []
        recovery_points = _format_points(
            daily_stats,
            lambda data: (data['recovered'] / data['claims'] * 100) if data['claims'] else 0.0
        ) if daily_stats else []
        compliance_points = _format_points(
            daily_stats,
            lambda data: (data['within_30'] / data['claims'] * 100) if data['claims'] else 0.0
        ) if daily_stats else []
        alerts_points = _format_points(alert_daily, lambda count: count) if alert_daily else []

        chart_series: List[Dict[str, Any]] = []
        if claims_points:
            chart_series.append({
                "id": "claims",
                "metric": "total_claims",
                "label": "Claims Processed",
                "points": claims_points
            })
        if recovery_points:
            chart_series.append({
                "id": "recovery",
                "metric": "recovery_rate",
                "label": "Recovery Rate",
                "points": recovery_points
            })
        if alerts_points:
            chart_series.append({
                "id": "alerts",
                "metric": "fraud_alerts",
                "label": "Fraud Alerts",
                "points": alerts_points
            })
        if compliance_points:
            chart_series.append({
                "id": "compliance",
                "metric": "within_30_days_compliance",
                "label": "30-Day Compliance",
                "points": compliance_points
            })

        return {
            "period": "current_month",
            "updated_at": now.isoformat(),
            "metrics": {
                "total_claims": len(monthly_rejections),
                "total_billed": total_billed,
                "total_rejected": total_rejected,
                "rejection_rate": rejection_rate,
                "recovery_rate": recovery_rate,
                "overdue_letters": overdue,
                "within_30_days_compliance": compliance_hits
            },
            "fraud_alerts_count": len(fraud_alerts),
            "recent_alerts": fraud_alerts,
            "chart_series": chart_series
        }
    except Exception as exc:
        logger.exception("Dashboard analytics failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Analytics failed") from exc

@app.get("/api/analytics/trends")
async def get_trends(days: int = 30, db = Depends(get_database)):
    """Get rejection and recovery trends"""
    try:
        from datetime import timedelta

        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        rejections = await db.rejections.find({
            "rejection_received_date": {
                "$gte": start_date,
                "$lte": end_date
            }
        }).to_list(length=5000)

        # Group by date
        daily_stats = {}
        for rejection in rejections:
            date_key = rejection['rejection_received_date'].strftime('%Y-%m-%d')
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    "count": 0,
                    "rejected_amount": 0,
                    "recovered_count": 0
                }
            daily_stats[date_key]["count"] += 1
            daily_stats[date_key]["rejected_amount"] += rejection['rejected_amount']['total']
            if rejection.get('status') == 'RECOVERED':
                daily_stats[date_key]["recovered_count"] += 1

        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "daily_trends": daily_stats
        }
    except Exception as exc:
        logger.exception("Trends analysis failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Trends analysis failed") from exc

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest, db = Depends(get_database)):
    """Authenticate user and return JWT token"""
    try:
        from auth import authenticate_user, create_access_token
        from datetime import timedelta

        user = await authenticate_user(db, request.username, request.password)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.disabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )

        # Create access token
        access_token = create_access_token(
            data={
                "sub": user.user_id,
                "username": user.username,
                "role": user.role,
                "email": user.email
            },
            expires_delta=timedelta(hours=24)
        )

        # Log authentication
        await _audit_log(db, "LOGIN", user.user_id, {
            "username": user.username,
            "role": user.role
        })

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Login failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="Authentication failed") from exc

@app.post("/api/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Security(security), db = Depends(get_database)):
    """Logout user"""
    from auth import decode_access_token
    current_user = decode_access_token(credentials.credentials)
    await _audit_log(db, "LOGOUT", current_user.user_id, {
        "username": current_user.username
    })
    return {"message": "Successfully logged out"}

@app.get("/api/auth/me")
async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Get current user information"""
    from auth import decode_access_token
    current_user = decode_access_token(credentials.credentials)
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "role": current_user.role,
        "email": current_user.email
    }

# ============================================================================
# FHIR VALIDATION ENDPOINTS
# ============================================================================

class FHIRValidationRequest(BaseModel):
    resource_type: str
    data: Dict[str, Any]

@app.post("/api/fhir/validate")
async def validate_fhir(request: FHIRValidationRequest, db = Depends(get_database)):
    """Validate FHIR resource"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/fhir-validator'))
        from validator import validate_fhir_resource

        result = validate_fhir_resource(request.resource_type, request.data)

        await _audit_log(db, "fhir_validation", "system", {
            "resource_type": request.resource_type,
            "valid": result.get("valid")
        })

        return result
    except Exception as exc:
        logger.exception("FHIR validation failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="FHIR validation failed") from exc

# ============================================================================
# NPHIES INTEGRATION ENDPOINTS
# ============================================================================

class NPHIESClaimRequest(BaseModel):
    claim_data: Dict[str, Any]

@app.post("/api/nphies/submit-claim")
async def submit_claim_to_nphies(request: NPHIESClaimRequest, db = Depends(get_database)):
    """Submit claim to NPHIES"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/nphies-integration'))
        from client import submit_claim_to_nphies

        result = await submit_claim_to_nphies(request.claim_data)

        # Store NPHIES reference in database
        if result.get("success"):
            await db.nphies_submissions.insert_one({
                "submitted_at": datetime.now(timezone.utc),
                "nphies_reference": result.get("nphies_reference"),
                "claim_data": request.claim_data,
                "status": result.get("status")
            })

        await _audit_log(db, "nphies_claim_submission", "system", {
            "success": result.get("success"),
            "nphies_reference": result.get("nphies_reference")
        })

        return result
    except Exception as exc:
        logger.exception("NPHIES claim submission failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="NPHIES submission failed") from exc

class NPHIESAppealRequest(BaseModel):
    claim_id: str
    patient_id: str
    supporting_info: List[Dict[str, Any]] = []

@app.post("/api/nphies/submit-appeal")
async def submit_appeal_to_nphies(request: NPHIESAppealRequest, db = Depends(get_database)):
    """Submit appeal to NPHIES"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/nphies-integration'))
        from client import submit_nphies_appeal

        result = await submit_nphies_appeal(request.model_dump())

        if result.get("success"):
            await db.nphies_appeals.insert_one({
                "submitted_at": datetime.now(timezone.utc),
                "appeal_reference": result.get("appeal_reference"),
                "claim_id": request.claim_id,
                "status": result.get("status")
            })

        return result
    except Exception as exc:
        logger.exception("NPHIES appeal submission failed", exc_info=exc)
        raise HTTPException(status_code=500, detail="NPHIES appeal failed") from exc

@app.get("/api/nphies/claim-response/{nphies_reference}")
async def get_nphies_claim_response(nphies_reference: str, db = Depends(get_database)):
    """Get claim response from NPHIES"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/nphies-integration'))
        from client import get_nphies_claim_response

        result = await get_nphies_claim_response(nphies_reference)
        return result
    except Exception as exc:
        logger.exception("Failed to get NPHIES claim response", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to get claim response") from exc

# ============================================================================
# APPEALS MANAGEMENT ENDPOINTS
# ============================================================================

class AppealRequest(BaseModel):
    rejection_id: str
    reason: str
    supporting_documents: List[str] = []
    notes: Dict[str, str]  # Bilingual notes

@app.post("/api/appeals")
async def create_appeal(appeal: AppealRequest, db = Depends(get_database)):
    """Create new appeal for rejected claim"""
    try:
        # Get rejection record
        rejection = await db.rejections.find_one({"id": appeal.rejection_id})
        if not rejection:
            raise HTTPException(status_code=404, detail="Rejection not found")

        # Create appeal
        appeal_doc = {
            "rejection_id": appeal.rejection_id,
            "created_at": datetime.now(timezone.utc),
            "status": "PENDING",
            "reason": appeal.reason,
            "supporting_documents": appeal.supporting_documents,
            "notes": appeal.notes,
            "rejection_amount": rejection["rejected_amount"],
            "audit_log": [{
                "timestamp": datetime.now(timezone.utc),
                "action": "APPEAL_CREATED",
                "user_id": "system"
            }]
        }

        result = await db.appeals.insert_one(appeal_doc)

        # Update rejection status
        await db.rejections.update_one(
            {"id": appeal.rejection_id},
            {"$set": {"status": "UNDER_APPEAL"}}
        )

        return {"id": str(result.inserted_id), "status": "created"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create appeal", exc_info=exc)
        raise HTTPException(status_code=500, detail="Appeal creation failed") from exc

@app.get("/api/appeals")
async def get_appeals(status: Optional[str] = None, db = Depends(get_database)):
    """Get appeals with optional status filter"""
    try:
        query = {}
        if status:
            query["status"] = status

        appeals = await db.appeals.find(query).sort("created_at", -1).to_list(length=500)
        return jsonable_encoder(appeals)
    except Exception as exc:
        logger.exception("Failed to fetch appeals", exc_info=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch appeals") from exc

# ============================================================================
# AUDIT LOG ENDPOINTS
# ============================================================================

@app.get("/api/audit/user/{user_id}")
async def get_user_audit_trail(user_id: str, limit: int = 100, db = Depends(get_database)):
    """Get audit trail for specific user"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/audit-logger'))
        from logger import AuditLogger

        audit_logger = AuditLogger(db)
        activity = await audit_logger.get_user_activity(user_id, limit=limit)

        return jsonable_encoder(activity)
    except Exception as exc:
        logger.exception("Failed to fetch audit trail", exc_info=exc)
        raise HTTPException(status_code=500, detail="Audit trail fetch failed") from exc

@app.get("/api/audit/suspicious")
async def get_suspicious_activity(db = Depends(get_database)):
    """Detect suspicious activity patterns"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/audit-logger'))
        from logger import AuditLogger

        audit_logger = AuditLogger(db)
        suspicious = await audit_logger.detect_suspicious_activity()

        return {"suspicious_events": suspicious, "count": len(suspicious)}
    except Exception as exc:
        logger.exception("Failed to detect suspicious activity", exc_info=exc)
        raise HTTPException(status_code=500, detail="Suspicious activity detection failed") from exc

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

async def _audit_log(db, action: str, user_id: str, details: Dict[str, Any]):
    """Create audit log entry"""
    try:
        await db.audit_log.insert_one({
            "timestamp": datetime.now(timezone.utc),
            "action": action,
            "user_id": user_id,
            "details": details
        })
    except Exception as exc:
        logger.error(f"Failed to create audit log: {exc}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
