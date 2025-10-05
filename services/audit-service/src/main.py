"""
Audit Service - Main Application

Append-only event logging for all RCM operations with immutable storage.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import logging
from typing import Optional, List
from datetime import datetime
import hashlib
import json

from .models import (
    AuditLogRequest,
    AuditLogResponse,
    AuditEvent,
    AuditQueryResponse,
    TimelineResponse
)
from .kafka_producer import KafkaAuditProducer
from .config import Settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Settings
settings = Settings()

# Prometheus metrics
audit_events_total = Counter(
    'audit_events_total',
    'Total number of audit events',
    ['event_type', 'outcome']
)
audit_log_duration = Histogram(
    'audit_log_duration_seconds',
    'Audit log write duration'
)

# Global state
mongo_client: Optional[AsyncIOMotorClient] = None
kafka_producer: Optional[KafkaAuditProducer] = None
last_hash: str = "genesis"  # Initial hash for chain

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    global mongo_client, kafka_producer, last_hash
    
    # Startup
    logger.info("Starting Audit Service...")
    
    # MongoDB connection
    mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        await mongo_client.admin.command('ping')
        logger.info("MongoDB connection established")
        
        # Load last hash from database for integrity chain
        last_event = await mongo_client.rcm.audit_events.find_one(
            {},
            sort=[("timestamp", -1)]
        )
        if last_event:
            last_hash = last_event.get("integrity", {}).get("hash", "genesis")
            logger.info(f"Loaded last hash: {last_hash[:16]}...")
        
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
    
    # Kafka producer
    if settings.enable_kafka:
        kafka_producer = KafkaAuditProducer(
            brokers=settings.kafka_brokers,
            topic=settings.kafka_topic
        )
        await kafka_producer.start()
        logger.info("Kafka producer initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Audit Service...")
    if kafka_producer:
        await kafka_producer.stop()
    if mongo_client:
        mongo_client.close()

# FastAPI app
app = FastAPI(
    title="Audit Service",
    description="Append-only event logging with immutable storage",
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

def compute_event_hash(event_data: dict, previous_hash: str) -> str:
    """Compute SHA256 hash for event with previous hash (chain)"""
    hash_input = json.dumps(event_data, sort_keys=True) + previous_hash
    return f"sha256:{hashlib.sha256(hash_input.encode()).hexdigest()}"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health = {
        "status": "healthy",
        "service": "audit-service",
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
    
    # Check Kafka
    if kafka_producer:
        health["kafka"] = "connected" if kafka_producer.is_connected() else "disconnected"
    
    return health

@app.post("/api/v1/audit/log", response_model=AuditLogResponse)
async def log_audit_event(request: AuditLogRequest):
    """
    Log a new audit event to the immutable audit trail.
    
    This endpoint:
    1. Computes hash chain for integrity
    2. Writes to MongoDB (append-only)
    3. Publishes to Kafka for real-time processing
    """
    global last_hash
    
    with audit_log_duration.time():
        try:
            # Generate audit ID and event ID
            audit_id = f"audit_{datetime.utcnow().timestamp()}"
            event_id = f"evt_{datetime.utcnow().timestamp()}"
            
            # Prepare event document
            event_data = {
                "audit_id": audit_id,
                "event_id": event_id,
                "event_type": request.eventType,
                "actor": request.actor.dict(),
                "resource": request.resource.dict() if request.resource else None,
                "action": request.action,
                "outcome": request.outcome,
                "metadata": request.metadata or {},
                "timestamp": request.timestamp or datetime.utcnow()
            }
            
            # Compute hash chain
            current_hash = compute_event_hash(event_data, last_hash)
            event_data["integrity"] = {
                "hash": current_hash,
                "previous_hash": last_hash
            }
            
            # Write to MongoDB
            await mongo_client.rcm.audit_events.insert_one(event_data)
            last_hash = current_hash
            
            # Publish to Kafka
            if kafka_producer:
                await kafka_producer.send_event(event_data)
            
            # Track metrics
            audit_events_total.labels(
                event_type=request.eventType,
                outcome=request.outcome
            ).inc()
            
            logger.info(f"Audit event logged: {audit_id} - {request.eventType}")
            
            return AuditLogResponse(
                auditId=audit_id,
                eventId=event_id,
                logged=True,
                timestamp=datetime.utcnow(),
                integrity={
                    "hash": current_hash,
                    "previousHash": last_hash
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Audit logging failed: {str(e)}"
            )

@app.get("/api/v1/audit/query", response_model=AuditQueryResponse)
async def query_audit_logs(
    actor_id: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Query audit logs with filters.
    
    Supports pagination and filtering by actor, resource, event type, and timeframe.
    """
    try:
        # Build query filter
        query_filter = {}
        
        if actor_id:
            query_filter["actor.userId"] = actor_id
        if resource_type:
            query_filter["resource.resourceType"] = resource_type
        if resource_id:
            query_filter["resource.resourceId"] = resource_id
        if event_type:
            query_filter["event_type"] = event_type
        if start_date or end_date:
            query_filter["timestamp"] = {}
            if start_date:
                query_filter["timestamp"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                query_filter["timestamp"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get total count
        total = await mongo_client.rcm.audit_events.count_documents(query_filter)
        
        # Query with pagination
        skip = (page - 1) * limit
        cursor = mongo_client.rcm.audit_events.find(query_filter).sort("timestamp", -1).skip(skip).limit(limit)
        events = await cursor.to_list(length=limit)
        
        # Convert to response model
        audit_events = [
            AuditEvent(
                auditId=e["audit_id"],
                eventType=e["event_type"],
                actor=e["actor"],
                resource=e.get("resource"),
                action=e["action"],
                outcome=e["outcome"],
                timestamp=e["timestamp"],
                metadata=e.get("metadata")
            )
            for e in events
        ]
        
        return AuditQueryResponse(
            events=audit_events,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit
            }
        )
        
    except Exception as e:
        logger.error(f"Audit query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}"
        )

@app.get("/api/v1/audit/timeline/{resource_type}/{resource_id}", response_model=TimelineResponse)
async def get_resource_timeline(resource_type: str, resource_id: str):
    """
    Get full audit timeline for a specific resource.
    
    Returns chronological list of all events for the resource.
    """
    try:
        query_filter = {
            "resource.resourceType": resource_type,
            "resource.resourceId": resource_id
        }
        
        cursor = mongo_client.rcm.audit_events.find(query_filter).sort("timestamp", 1)
        events = await cursor.to_list(length=1000)  # Max 1000 events
        
        timeline = [
            {
                "timestamp": e["timestamp"],
                "eventType": e["event_type"],
                "actor": e["actor"].get("username", e["actor"].get("userId")),
                "action": e["action"],
                "outcome": e["outcome"],
                "metadata": e.get("metadata")
            }
            for e in events
        ]
        
        return TimelineResponse(
            resourceType=resource_type,
            resourceId=resource_id,
            timeline=timeline
        )
        
    except Exception as e:
        logger.error(f"Timeline query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Timeline query failed: {str(e)}"
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
        port=8002,
        reload=True
    )
