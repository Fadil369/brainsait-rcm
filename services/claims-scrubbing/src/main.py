"""
Claims Scrubbing Service - FastAPI Application

Validates claims against NPHIES MDS, payer rules, and ML-based denial risk scoring.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from redis import asyncio as aioredis
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import httpx
from typing import Optional
import logging

from .config import Settings, get_settings
from .models import (
    ClaimValidationRequest,
    ClaimValidationResponse,
    ValidationIssue,
    ComplianceStatus,
    RiskLevel
)
from .validators import NPHIESValidator, PayerRulesValidator
from .ml_client import MLInferenceClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
claims_validated_total = Counter(
    'claims_validated_total',
    'Total number of claims validated',
    ['status', 'payer']
)
validation_duration = Histogram(
    'validation_duration_seconds',
    'Time spent validating claims',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)
denial_risk_score = Histogram(
    'denial_risk_score',
    'Distribution of denial risk scores',
    buckets=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

# Global clients
db_client: Optional[AsyncIOMotorClient] = None
redis_client: Optional[aioredis.Redis] = None
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    global db_client, redis_client, http_client
    
    settings = get_settings()
    
    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.version}")
    
    # Initialize MongoDB
    db_client = AsyncIOMotorClient(settings.mongodb_uri)
    await db_client.admin.command('ping')
    logger.info("✓ Connected to MongoDB")
    
    # Initialize Redis
    redis_client = await aioredis.from_url(
        settings.redis_uri,
        encoding="utf-8",
        decode_responses=True
    )
    await redis_client.ping()
    logger.info("✓ Connected to Redis")
    
    # Initialize HTTP client for external APIs
    http_client = httpx.AsyncClient(timeout=30.0)
    logger.info("✓ HTTP client initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    db_client.close()
    await redis_client.close()
    await http_client.aclose()
    logger.info("✓ Cleanup complete")


# Create FastAPI app
app = FastAPI(
    title="Claims Scrubbing Service",
    description="AI-powered pre-submission validation for NPHIES claims",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    """Dependency: MongoDB client"""
    if db_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not initialized"
        )
    return db_client[get_settings().mongodb_database]


def get_redis():
    """Dependency: Redis client"""
    if redis_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis not initialized"
        )
    return redis_client


@app.get("/health")
async def health_check():
    """Health check endpoint for K8s liveness/readiness probes"""
    try:
        # Check MongoDB
        await db_client.admin.command('ping')
        
        # Check Redis
        await redis_client.ping()
        
        return {
            "status": "healthy",
            "service": "claims-scrubbing",
            "version": "1.0.0",
            "checks": {
                "mongodb": "up",
                "redis": "up"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post(
    "/api/v1/claims/validate",
    response_model=ClaimValidationResponse,
    status_code=status.HTTP_200_OK
)
async def validate_claim(
    request: ClaimValidationRequest,
    db = Depends(get_db),
    redis = Depends(get_redis),
    settings: Settings = Depends(get_settings)
):
    """
    Validate a claim against NPHIES MDS, payer rules, and ML-based risk scoring.
    
    Returns validation status, compliance checks, risk score, and recommendations.
    """
    with validation_duration.time():
        try:
            logger.info(f"Validating claim for patient {request.patient_id}, payer {request.payer_id}")
            
            # Check cache first
            cache_key = f"validation:{request.patient_id}:{request.payer_id}:{request.service_date}"
            cached_result = await redis.get(cache_key)
            if cached_result:
                logger.info("Returning cached validation result")
                return ClaimValidationResponse.model_validate_json(cached_result)
            
            issues = []
            
            # 1. NPHIES MDS Validation
            nphies_validator = NPHIESValidator(settings)
            nphies_issues = await nphies_validator.validate(request)
            issues.extend(nphies_issues)
            
            # 2. Payer-specific rules
            payer_validator = PayerRulesValidator(settings)
            payer_issues = await payer_validator.validate(request)
            issues.extend(payer_issues)
            
            # 3. ML-based Denial Risk Scoring (if enabled)
            denial_risk_score_value = 0.0
            if settings.enable_ml_scoring:
                ml_client = MLInferenceClient(http_client, settings)
                denial_risk_score_value = await ml_client.predict_denial_risk(request)
                denial_risk_score.observe(denial_risk_score_value)
            
            # Determine risk level
            if denial_risk_score_value < 30:
                risk_level = RiskLevel.LOW
            elif denial_risk_score_value < 60:
                risk_level = RiskLevel.MEDIUM
            else:
                risk_level = RiskLevel.HIGH
            
            # Determine overall status
            has_errors = any(issue.severity == "error" for issue in issues)
            has_warnings = any(issue.severity == "warning" for issue in issues)
            
            if has_errors:
                overall_status = "error"
            elif has_warnings:
                overall_status = "warning"
            else:
                overall_status = "pass"
            
            # Build response
            response = ClaimValidationResponse(
                validation_id=f"val_{request.patient_id}_{request.service_date.replace('-', '')}",
                status=overall_status,
                denial_risk_score=denial_risk_score_value,
                risk_level=risk_level,
                compliance=ComplianceStatus(
                    nphies_mds="pass" if not any(
                        i.code.startswith("NPHIES_") for i in issues if i.severity == "error"
                    ) else "fail",
                    payer_rules="pass" if not any(
                        i.code.startswith("PAYER_") for i in issues if i.severity == "error"
                    ) else "fail",
                    eligibility="pass"  # TODO: Implement eligibility check
                ),
                issues=issues,
                recommendations=[],  # TODO: Generate recommendations based on issues
                auto_coding=None  # TODO: Implement auto-coding if enabled
            )
            
            # Cache result
            await redis.setex(
                cache_key,
                settings.redis_ttl,
                response.model_dump_json()
            )
            
            # Store in database for analytics
            await db.validation_history.insert_one(
                response.model_dump(mode='json')
            )
            
            # Update metrics
            claims_validated_total.labels(
                status=overall_status,
                payer=request.payer_id
            ).inc()
            
            logger.info(
                f"Validation complete: {overall_status}, "
                f"risk_score={denial_risk_score_value:.2f}, "
                f"issues={len(issues)}"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Validation failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Validation error: {str(e)}"
            )


@app.post("/api/v1/claims/batch-validate")
async def batch_validate_claims(
    requests: list[ClaimValidationRequest],
    db = Depends(get_db),
    redis = Depends(get_redis)
):
    """
    Batch validation for multiple claims.
    
    Returns array of validation responses.
    """
    # TODO: Implement batch validation with concurrency control
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Batch validation not yet implemented"
    )


@app.get("/api/v1/claims/validation-history")
async def get_validation_history(
    patient_id: Optional[str] = None,
    payer_id: Optional[str] = None,
    limit: int = 100,
    db = Depends(get_db)
):
    """
    Retrieve validation history for analytics.
    
    Filterable by patient_id and payer_id.
    """
    try:
        query = {}
        if patient_id:
            query["patient_id"] = patient_id
        if payer_id:
            query["payer_id"] = payer_id
        
        cursor = db.validation_history.find(query).sort("_id", -1).limit(limit)
        history = await cursor.to_list(length=limit)
        
        return {
            "total": len(history),
            "results": history
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
