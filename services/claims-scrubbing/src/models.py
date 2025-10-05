"""
Pydantic models for Claims Scrubbing Service
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date
from enum import Enum


class RiskLevel(str, Enum):
    """Denial risk level classification"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueSeverity(str, Enum):
    """Validation issue severity"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class ClaimDocumentation(BaseModel):
    """Supporting documentation for claim"""
    physician_notes: Optional[str] = Field(None, description="Physician clinical notes")
    pre_auth_number: Optional[str] = Field(None, description="Pre-authorization number")
    lab_results: Optional[List[str]] = Field(default_factory=list, description="Lab result IDs")
    imaging_reports: Optional[List[str]] = Field(default_factory=list, description="Imaging report IDs")


class ClaimValidationRequest(BaseModel):
    """Request model for claim validation"""
    patient_id: str = Field(..., description="Patient national ID or MRN", min_length=1)
    payer_id: str = Field(..., description="Payer identifier (e.g., PAYER_A)")
    service_date: str = Field(..., description="Date of service (YYYY-MM-DD)")
    icd_codes: List[str] = Field(..., description="ICD-10 diagnosis codes", min_items=1)
    cpt_codes: List[str] = Field(..., description="CPT procedure codes", min_items=1)
    total_amount: float = Field(..., description="Total claim amount in SAR", gt=0)
    provider_id: str = Field(..., description="Provider/facility identifier")
    documentation: Optional[ClaimDocumentation] = Field(None, description="Supporting documentation")
    
    @field_validator('service_date')
    @classmethod
    def validate_service_date(cls, v: str) -> str:
        """Validate service date format"""
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('service_date must be in YYYY-MM-DD format')
    
    @field_validator('icd_codes', 'cpt_codes')
    @classmethod
    def validate_codes(cls, v: List[str]) -> List[str]:
        """Validate codes are not empty strings"""
        if any(not code.strip() for code in v):
            raise ValueError('Codes cannot be empty strings')
        return v


class ValidationIssue(BaseModel):
    """Individual validation issue"""
    severity: IssueSeverity = Field(..., description="Issue severity level")
    code: str = Field(..., description="Machine-readable issue code")
    message: str = Field(..., description="Human-readable issue description")
    field: Optional[str] = Field(None, description="Field related to issue")
    suggestion: Optional[str] = Field(None, description="Suggested resolution")


class Recommendation(BaseModel):
    """Recommendation for improving claim acceptance"""
    type: str = Field(..., description="Recommendation type (documentation, coding, etc.)")
    message: str = Field(..., description="Recommendation text")
    priority: Optional[int] = Field(None, description="Priority level (1=highest)", ge=1, le=5)


class AutoCodingSuggestion(BaseModel):
    """Auto-coding suggestions from NLP"""
    suggested_icd: List[str] = Field(default_factory=list, description="Suggested ICD codes")
    suggested_cpt: List[str] = Field(default_factory=list, description="Suggested CPT codes")
    confidence: float = Field(..., description="Confidence score (0-1)", ge=0, le=1)
    reasoning: Optional[str] = Field(None, description="Explanation for suggestions")


class ComplianceStatus(BaseModel):
    """Compliance check results"""
    nphies_mds: str = Field(..., description="NPHIES MDS compliance (pass/fail/warning)")
    payer_rules: str = Field(..., description="Payer-specific rules (pass/fail/warning)")
    eligibility: str = Field(..., description="Patient eligibility status (pass/fail/warning)")


class ClaimValidationResponse(BaseModel):
    """Response model for claim validation"""
    validation_id: str = Field(..., description="Unique validation identifier")
    status: str = Field(..., description="Overall validation status (pass/warning/error)")
    denial_risk_score: float = Field(..., description="ML-predicted denial risk (0-100)", ge=0, le=100)
    risk_level: RiskLevel = Field(..., description="Risk level classification")
    compliance: ComplianceStatus = Field(..., description="Compliance check results")
    issues: List[ValidationIssue] = Field(default_factory=list, description="Validation issues found")
    recommendations: List[Recommendation] = Field(default_factory=list, description="Improvement recommendations")
    auto_coding: Optional[AutoCodingSuggestion] = Field(None, description="Auto-coding suggestions")
    
    class Config:
        json_schema_extra = {
            "example": {
                "validation_id": "val_1234567890_20251001",
                "status": "warning",
                "denial_risk_score": 35.2,
                "risk_level": "medium",
                "compliance": {
                    "nphies_mds": "pass",
                    "payer_rules": "pass",
                    "eligibility": "warning"
                },
                "issues": [
                    {
                        "severity": "warning",
                        "code": "ELIGIBILITY_DATE_NEAR_EXPIRY",
                        "message": "Service date within 5 days of policy expiry",
                        "field": "service_date",
                        "suggestion": "Verify patient eligibility for service date"
                    }
                ],
                "recommendations": [
                    {
                        "type": "documentation",
                        "message": "Consider adding spirometry test results",
                        "priority": 2
                    }
                ],
                "auto_coding": {
                    "suggested_icd": ["J45.901"],
                    "suggested_cpt": [],
                    "confidence": 0.87,
                    "reasoning": "Based on physician notes mentioning unspecified asthma"
                }
            }
        }
