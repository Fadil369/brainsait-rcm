"""
FHIR Gateway Service - Main Application

Provides FHIR R4 conformance validation and NPHIES MDS mapping.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import logging
from typing import Optional
from datetime import datetime

from .models import (
    FHIRValidationRequest,
    FHIRValidationResponse,
    NPHIESMappingRequest,
    NPHIESMappingResponse,
    ConformanceIssue,
    IssueSeverity
)
from .validators import FHIRValidator, NPHIESMapper
from .config import Settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Settings
settings = Settings()

# Prometheus metrics
fhir_validations_total = Counter(
    'fhir_validations_total',
    'Total number of FHIR validations',
    ['resource_type', 'is_valid']
)
fhir_validation_duration = Histogram(
    'fhir_validation_duration_seconds',
    'FHIR validation duration'
)
nphies_mappings_total = Counter(
    'nphies_mappings_total',
    'Total number of NPHIES mappings',
    ['compliant']
)

# Global state
mongo_client: Optional[AsyncIOMotorClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    global mongo_client
    
    # Startup
    logger.info("Starting FHIR Gateway Service...")
    mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    
    # Verify MongoDB connection
    try:
        await mongo_client.admin.command('ping')
        logger.info("MongoDB connection established")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down FHIR Gateway Service...")
    if mongo_client:
        mongo_client.close()

# FastAPI app
app = FastAPI(
    title="FHIR Gateway Service",
    description="FHIR R4 validation and NPHIES MDS mapping",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize validators
fhir_validator = FHIRValidator(
    terminology_server=settings.terminology_server
)
nphies_mapper = NPHIESMapper(
    nphies_base_url=settings.nphies_base_url
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health = {
        "status": "healthy",
        "service": "fhir-gateway",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Check MongoDB
    try:
        await mongo_client.admin.command('ping')
        health["mongodb"] = "connected"
    except Exception as e:
        health["mongodb"] = "disconnected"
        health["status"] = "unhealthy"
        logger.error(f"MongoDB health check failed: {e}")
    
    return health

@app.post("/api/v1/fhir/validate", response_model=FHIRValidationResponse)
async def validate_fhir_resource(request: FHIRValidationRequest):
    """
    Validate a FHIR resource against R4 profile and NPHIES MDS requirements.
    
    This endpoint performs:
    1. FHIR R4 conformance validation
    2. NPHIES MDS compliance check
    3. Terminology validation (code systems)
    """
    with fhir_validation_duration.time():
        try:
            # Perform FHIR R4 validation
            validation_result = await fhir_validator.validate_resource(
                resource=request.resource,
                resource_type=request.resourceType,
                profile=request.profile
            )
            
            # Track metrics
            fhir_validations_total.labels(
                resource_type=request.resourceType,
                is_valid=validation_result.isValid
            ).inc()
            
            # Log validation to MongoDB
            if mongo_client:
                await mongo_client.rcm.fhir_validations.insert_one({
                    "validation_id": validation_result.validationId,
                    "resource_type": request.resourceType,
                    "is_valid": validation_result.isValid,
                    "conformance_issues_count": len(validation_result.conformanceIssues),
                    "nphies_compliant": validation_result.nphiesMdsCompliant,
                    "timestamp": datetime.utcnow()
                })
            
            return validation_result
            
        except Exception as e:
            logger.error(f"FHIR validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Validation failed: {str(e)}"
            )

@app.post("/api/v1/fhir/map-to-nphies", response_model=NPHIESMappingResponse)
async def map_to_nphies(request: NPHIESMappingRequest):
    """
    Convert internal claim model to NPHIES-compliant FHIR Bundle.
    
    This endpoint creates a FHIR transaction bundle containing:
    - Patient resource
    - Claim resource
    - Coverage resource (if applicable)
    - Supporting resources
    """
    try:
        # Perform NPHIES mapping
        mapping_result = await nphies_mapper.map_claim_to_bundle(request)
        
        # Track metrics
        nphies_mappings_total.labels(
            compliant=mapping_result.nphiesCompliant
        ).inc()
        
        # Log mapping to MongoDB
        if mongo_client:
            await mongo_client.rcm.nphies_mappings.insert_one({
                "claim_id": request.claimId,
                "nphies_compliant": mapping_result.nphiesCompliant,
                "warnings_count": len(mapping_result.mappingWarnings),
                "timestamp": datetime.utcnow()
            })
        
        return mapping_result
        
    except Exception as e:
        logger.error(f"NPHIES mapping error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mapping failed: {str(e)}"
        )

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
