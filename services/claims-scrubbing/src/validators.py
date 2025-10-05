"""
NPHIES MDS Validator

Validates claims against NPHIES Minimum Data Set requirements.
"""
from typing import List
import logging

from .models import ClaimValidationRequest, ValidationIssue, IssueSeverity
from .config import Settings

logger = logging.getLogger(__name__)


class NPHIESValidator:
    """Validates claims against NPHIES MDS requirements"""
    
    # Valid ICD-10 code pattern (simplified for MVP)
    ICD10_PATTERN = r'^[A-Z]\d{2}(\.\d{1,2})?$'
    
    # Valid CPT code pattern (5 digits)
    CPT_PATTERN = r'^\d{5}$'
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    async def validate(self, request: ClaimValidationRequest) -> List[ValidationIssue]:
        """
        Validate claim against NPHIES MDS.
        
        Returns list of validation issues found.
        """
        issues = []
        
        # Validate ICD codes
        issues.extend(self._validate_icd_codes(request.icd_codes))
        
        # Validate CPT codes
        issues.extend(self._validate_cpt_codes(request.cpt_codes))
        
        # Validate patient ID format
        if len(request.patient_id) != 10:
            issues.append(ValidationIssue(
                severity=IssueSeverity.WARNING,
                code="NPHIES_PATIENT_ID_FORMAT",
                message="Patient ID should be 10 digits (Saudi national ID format)",
                field="patient_id",
                suggestion="Verify patient ID is correct national ID"
            ))
        
        # Validate claim amount limits
        if request.total_amount < self.settings.min_claim_amount:
            issues.append(ValidationIssue(
                severity=IssueSeverity.ERROR,
                code="NPHIES_AMOUNT_TOO_LOW",
                message=f"Claim amount below minimum ({self.settings.min_claim_amount} SAR)",
                field="total_amount",
                suggestion=f"Claim amount must be at least {self.settings.min_claim_amount} SAR"
            ))
        
        if request.total_amount > self.settings.max_claim_amount:
            issues.append(ValidationIssue(
                severity=IssueSeverity.ERROR,
                code="NPHIES_AMOUNT_TOO_HIGH",
                message=f"Claim amount exceeds maximum ({self.settings.max_claim_amount} SAR)",
                field="total_amount",
                suggestion="High-value claims require special authorization"
            ))
        
        # Validate code limits
        if len(request.icd_codes) > self.settings.max_icd_codes:
            issues.append(ValidationIssue(
                severity=IssueSeverity.ERROR,
                code="NPHIES_TOO_MANY_ICD_CODES",
                message=f"Exceeds maximum ICD codes ({self.settings.max_icd_codes})",
                field="icd_codes",
                suggestion=f"Reduce to {self.settings.max_icd_codes} most relevant diagnoses"
            ))
        
        if len(request.cpt_codes) > self.settings.max_cpt_codes:
            issues.append(ValidationIssue(
                severity=IssueSeverity.ERROR,
                code="NPHIES_TOO_MANY_CPT_CODES",
                message=f"Exceeds maximum CPT codes ({self.settings.max_cpt_codes})",
                field="cpt_codes",
                suggestion=f"Reduce to {self.settings.max_cpt_codes} procedures"
            ))
        
        logger.info(f"NPHIES validation complete: {len(issues)} issues found")
        return issues
    
    def _validate_icd_codes(self, codes: List[str]) -> List[ValidationIssue]:
        """Validate ICD-10 code format"""
        issues = []
        
        # TODO: Validate against official ICD-10 code list
        # For now, just check format
        import re
        pattern = re.compile(self.ICD10_PATTERN)
        
        for code in codes:
            if not pattern.match(code):
                issues.append(ValidationIssue(
                    severity=IssueSeverity.ERROR,
                    code="NPHIES_INVALID_ICD_FORMAT",
                    message=f"Invalid ICD-10 code format: {code}",
                    field="icd_codes",
                    suggestion="ICD-10 codes must follow pattern: Letter + 2-4 digits (e.g., J45.0)"
                ))
        
        return issues
    
    def _validate_cpt_codes(self, codes: List[str]) -> List[ValidationIssue]:
        """Validate CPT code format"""
        issues = []
        
        # TODO: Validate against official CPT code list
        # For now, just check format
        import re
        pattern = re.compile(self.CPT_PATTERN)
        
        for code in codes:
            if not pattern.match(code):
                issues.append(ValidationIssue(
                    severity=IssueSeverity.ERROR,
                    code="NPHIES_INVALID_CPT_FORMAT",
                    message=f"Invalid CPT code format: {code}",
                    field="cpt_codes",
                    suggestion="CPT codes must be 5 digits (e.g., 99213)"
                ))
        
        return issues


class PayerRulesValidator:
    """Validates claims against payer-specific rules"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    async def validate(self, request: ClaimValidationRequest) -> List[ValidationIssue]:
        """
        Validate claim against payer-specific rules.
        
        Returns list of validation issues found.
        """
        issues = []
        
        # TODO: Implement payer-specific rule engine (OPA or Drools)
        # For MVP, just stub with basic checks
        
        # Example: Payer A requires pre-auth for amounts > 5000 SAR
        if request.payer_id == "PAYER_A" and request.total_amount > 5000:
            if not request.documentation or not request.documentation.pre_auth_number:
                issues.append(ValidationIssue(
                    severity=IssueSeverity.ERROR,
                    code="PAYER_PREAUTH_REQUIRED",
                    message=f"{request.payer_id} requires pre-authorization for claims > 5000 SAR",
                    field="documentation.pre_auth_number",
                    suggestion="Obtain pre-authorization before submitting claim"
                ))
        
        logger.info(f"Payer rules validation complete: {len(issues)} issues found")
        return issues
