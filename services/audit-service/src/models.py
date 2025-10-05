"""
Audit Service - Data Models

Pydantic models for audit logging requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class AuditEventType(str, Enum):
    """Audit event types"""
    CLAIM_CREATED = "CLAIM_CREATED"
    CLAIM_VALIDATED = "CLAIM_VALIDATED"
    CLAIM_SUBMITTED = "CLAIM_SUBMITTED"
    CLAIM_APPROVED = "CLAIM_APPROVED"
    CLAIM_DENIED = "CLAIM_DENIED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    DATA_ACCESSED = "DATA_ACCESSED"
    DATA_MODIFIED = "DATA_MODIFIED"
    SYSTEM_ERROR = "SYSTEM_ERROR"


class AuditAction(str, Enum):
    """Audit action types"""
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXECUTE = "EXECUTE"


class AuditOutcome(str, Enum):
    """Audit outcome types"""
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    PARTIAL = "PARTIAL"


class Actor(BaseModel):
    """Actor performing the action"""
    userId: str
    username: str
    role: Optional[str] = None
    ipAddress: Optional[str] = None


class Resource(BaseModel):
    """Resource being acted upon"""
    resourceType: str
    resourceId: str
    branchId: Optional[str] = None


class AuditLogRequest(BaseModel):
    """Request to log an audit event"""
    eventType: AuditEventType
    actor: Actor
    resource: Optional[Resource] = None
    action: AuditAction
    outcome: AuditOutcome
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None


class IntegrityInfo(BaseModel):
    """Hash chain integrity information"""
    hash: str
    previousHash: str


class AuditLogResponse(BaseModel):
    """Response from logging an audit event"""
    auditId: str
    eventId: str
    logged: bool
    timestamp: datetime
    integrity: IntegrityInfo


class AuditEvent(BaseModel):
    """Audit event record"""
    auditId: str
    eventType: AuditEventType
    actor: Actor
    resource: Optional[Resource] = None
    action: AuditAction
    outcome: AuditOutcome
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class AuditQueryResponse(BaseModel):
    """Response from audit query"""
    events: List[AuditEvent]
    pagination: Dict[str, int]


class TimelineEvent(BaseModel):
    """Timeline event for resource history"""
    timestamp: datetime
    eventType: AuditEventType
    actor: str
    action: AuditAction
    outcome: AuditOutcome
    metadata: Optional[Dict[str, Any]] = None


class TimelineResponse(BaseModel):
    """Response from timeline query"""
    resourceType: str
    resourceId: str
    timeline: List[Dict[str, Any]]
