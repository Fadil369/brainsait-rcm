"""
FHIR Gateway Service - Data Models

Pydantic models for FHIR validation and NPHIES mapping requests/responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class IssueSeverity(str, Enum):
    """Issue severity levels"""
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class ConformanceIssue(BaseModel):
    """FHIR conformance issue"""
    severity: IssueSeverity
    code: str
    message: str
    location: Optional[str] = None
    suggestion: Optional[str] = None


class FHIRValidationRequest(BaseModel):
    """Request to validate a FHIR resource"""
    resourceType: str = Field(..., description="FHIR resource type (e.g., Claim, Patient)")
    resource: Dict[str, Any] = Field(..., description="FHIR resource JSON")
    profile: Optional[str] = Field(None, description="FHIR profile URL for validation")


class FHIRValidationResponse(BaseModel):
    """Response from FHIR resource validation"""
    validationId: str
    isValid: bool
    conformanceIssues: List[ConformanceIssue] = []
    nphiesMdsCompliant: bool
    terminologyIssues: List[ConformanceIssue] = []
    profile: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ClaimDocumentation(BaseModel):
    """Supporting documentation for claim"""
    preAuthNumber: Optional[str] = None
    attachments: List[str] = []


class NPHIESMappingRequest(BaseModel):
    """Request to map internal claim to NPHIES FHIR"""
    claimId: str
    patientId: str
    payerId: str
    providerId: str
    serviceDate: str
    icdCodes: List[str]
    cptCodes: List[str]
    totalAmount: float
    documentation: Optional[ClaimDocumentation] = None


class NPHIESMappingResponse(BaseModel):
    """Response from NPHIES mapping"""
    bundle: Dict[str, Any] = Field(..., description="FHIR Bundle JSON")
    nphiesCompliant: bool
    mappingWarnings: List[str] = []
