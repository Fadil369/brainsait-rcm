"""
FHIR Gateway Service - Validators

FHIRValidator and NPHIESMapper implementations.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import re

from .models import (
    FHIRValidationResponse,
    NPHIESMappingResponse,
    NPHIESMappingRequest,
    ConformanceIssue,
    IssueSeverity
)

logger = logging.getLogger(__name__)


class FHIRValidator:
    """
    FHIR R4 conformance validator
    
    Validates FHIR resources against R4 specification and NPHIES MDS requirements.
    """
    
    def __init__(self, terminology_server: str):
        self.terminology_server = terminology_server
        
        # NPHIES MDS required fields by resource type
        self.nphies_mds_requirements = {
            "Claim": [
                "status", "type", "patient", "created", "provider",
                "priority", "insurance", "item"
            ],
            "Patient": [
                "identifier", "name", "gender", "birthDate"
            ],
            "Coverage": [
                "status", "subscriber", "beneficiary", "payor"
            ]
        }
    
    async def validate_resource(
        self,
        resource: Dict[str, Any],
        resource_type: str,
        profile: Optional[str] = None
    ) -> FHIRValidationResponse:
        """
        Validate a FHIR resource against R4 specification.
        
        Args:
            resource: FHIR resource JSON
            resource_type: Resource type (e.g., "Claim")
            profile: Optional FHIR profile URL
        
        Returns:
            FHIRValidationResponse with validation results
        """
        validation_id = f"val_{int(datetime.utcnow().timestamp() * 1000)}"
        conformance_issues: List[ConformanceIssue] = []
        terminology_issues: List[ConformanceIssue] = []
        
        # Validate resource type matches
        if resource.get("resourceType") != resource_type:
            conformance_issues.append(ConformanceIssue(
                severity=IssueSeverity.ERROR,
                code="RESOURCE_TYPE_MISMATCH",
                message=f"Expected resourceType '{resource_type}', got '{resource.get('resourceType')}'",
                suggestion=f"Set resourceType to '{resource_type}'"
            ))
        
        # Validate required fields based on resource type
        required_fields = self._get_required_fields(resource_type)
        for field in required_fields:
            if field not in resource or resource[field] is None:
                conformance_issues.append(ConformanceIssue(
                    severity=IssueSeverity.ERROR,
                    code="MISSING_REQUIRED_FIELD",
                    message=f"Required field '{field}' is missing",
                    location=field,
                    suggestion=f"Add '{field}' field to the resource"
                ))
        
        # Validate NPHIES MDS compliance
        nphies_compliant = self._validate_nphies_mds(
            resource, resource_type, conformance_issues
        )
        
        # Validate terminology codes
        self._validate_terminology(resource, resource_type, terminology_issues)
        
        # Validate data types
        self._validate_data_types(resource, resource_type, conformance_issues)
        
        is_valid = (
            len([i for i in conformance_issues if i.severity == IssueSeverity.ERROR]) == 0
        )
        
        return FHIRValidationResponse(
            validationId=validation_id,
            isValid=is_valid,
            conformanceIssues=conformance_issues,
            nphiesMdsCompliant=nphies_compliant,
            terminologyIssues=terminology_issues,
            profile=profile
        )
    
    def _get_required_fields(self, resource_type: str) -> List[str]:
        """Get required fields for a resource type"""
        base_required = {
            "Claim": ["status", "type", "patient", "created", "provider"],
            "Patient": ["identifier"],
            "Coverage": ["status", "beneficiary", "payor"],
            "Organization": ["name"],
            "Practitioner": ["name"]
        }
        return base_required.get(resource_type, [])
    
    def _validate_nphies_mds(
        self,
        resource: Dict[str, Any],
        resource_type: str,
        issues: List[ConformanceIssue]
    ) -> bool:
        """
        Validate NPHIES Minimum Data Set requirements.
        
        Returns True if compliant, False otherwise.
        """
        mds_fields = self.nphies_mds_requirements.get(resource_type, [])
        compliant = True
        
        for field in mds_fields:
            if field not in resource or resource[field] is None:
                issues.append(ConformanceIssue(
                    severity=IssueSeverity.ERROR,
                    code="NPHIES_MDS_VIOLATION",
                    message=f"NPHIES MDS requires field '{field}'",
                    location=field,
                    suggestion=f"Add '{field}' as required by NPHIES MDS"
                ))
                compliant = False
        
        # Validate Saudi-specific identifiers for Patient
        if resource_type == "Patient":
            identifiers = resource.get("identifier", [])
            has_national_id = any(
                id.get("system") == "http://nphies.sa/identifier/nationalid"
                for id in identifiers
            )
            if not has_national_id:
                issues.append(ConformanceIssue(
                    severity=IssueSeverity.WARNING,
                    code="MISSING_NATIONAL_ID",
                    message="Patient should have Saudi National ID identifier",
                    location="identifier",
                    suggestion="Add identifier with system 'http://nphies.sa/identifier/nationalid'"
                ))
        
        return compliant
    
    def _validate_terminology(
        self,
        resource: Dict[str, Any],
        resource_type: str,
        issues: List[ConformanceIssue]
    ):
        """Validate terminology codes (ICD-10, CPT, SNOMED)"""
        if resource_type == "Claim":
            # Validate diagnosis codes (ICD-10)
            diagnoses = resource.get("diagnosis", [])
            for idx, diag in enumerate(diagnoses):
                coding = diag.get("diagnosisCodeableConcept", {}).get("coding", [])
                for code in coding:
                    if code.get("system") == "http://hl7.org/fhir/sid/icd-10":
                        if not self._validate_icd10_format(code.get("code", "")):
                            issues.append(ConformanceIssue(
                                severity=IssueSeverity.WARNING,
                                code="INVALID_ICD10_FORMAT",
                                message=f"ICD-10 code '{code.get('code')}' has invalid format",
                                location=f"diagnosis[{idx}].diagnosisCodeableConcept.coding",
                                suggestion="Use valid ICD-10 code format (e.g., J45.0)"
                            ))
            
            # Validate procedure codes (CPT)
            items = resource.get("item", [])
            for idx, item in enumerate(items):
                coding = item.get("productOrService", {}).get("coding", [])
                for code in coding:
                    if "cpt" in code.get("system", "").lower():
                        if not self._validate_cpt_format(code.get("code", "")):
                            issues.append(ConformanceIssue(
                                severity=IssueSeverity.WARNING,
                                code="INVALID_CPT_FORMAT",
                                message=f"CPT code '{code.get('code')}' has invalid format",
                                location=f"item[{idx}].productOrService.coding",
                                suggestion="Use valid CPT code format (5 digits)"
                            ))
    
    def _validate_data_types(
        self,
        resource: Dict[str, Any],
        resource_type: str,
        issues: List[ConformanceIssue]
    ):
        """Validate data type constraints"""
        # Validate date formats
        date_fields = ["created", "serviceDate", "billablePeriod"]
        for field in date_fields:
            if field in resource:
                value = resource[field]
                if isinstance(value, str) and not self._validate_date_format(value):
                    issues.append(ConformanceIssue(
                        severity=IssueSeverity.ERROR,
                        code="INVALID_DATE_FORMAT",
                        message=f"Field '{field}' has invalid date format",
                        location=field,
                        suggestion="Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)"
                    ))
    
    def _validate_icd10_format(self, code: str) -> bool:
        """Validate ICD-10 code format"""
        pattern = r'^[A-Z]\d{2}(\.\d{1,2})?$'
        return bool(re.match(pattern, code))
    
    def _validate_cpt_format(self, code: str) -> bool:
        """Validate CPT code format"""
        pattern = r'^\d{5}$'
        return bool(re.match(pattern, code))
    
    def _validate_date_format(self, date_str: str) -> bool:
        """Validate ISO 8601 date format"""
        try:
            # Try parsing as datetime
            datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return True
        except (ValueError, AttributeError):
            return False


class NPHIESMapper:
    """
    NPHIES FHIR Mapper
    
    Converts internal claim models to NPHIES-compliant FHIR Bundles.
    """
    
    def __init__(self, nphies_base_url: str):
        self.nphies_base_url = nphies_base_url
    
    async def map_claim_to_bundle(
        self,
        request: NPHIESMappingRequest
    ) -> NPHIESMappingResponse:
        """
        Map internal claim model to NPHIES FHIR Bundle.
        
        Creates a transaction bundle containing:
        - Patient resource
        - Claim resource
        - Coverage resource (if applicable)
        """
        warnings: List[str] = []
        
        # Create Patient resource
        patient_resource = self._create_patient_resource(
            request.patientId, warnings
        )
        
        # Create Claim resource
        claim_resource = self._create_claim_resource(request, warnings)
        
        # Create Coverage resource
        coverage_resource = self._create_coverage_resource(
            request.patientId, request.payerId, warnings
        )
        
        # Create transaction bundle
        bundle = {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": [
                {
                    "fullUrl": f"urn:uuid:patient-{request.patientId}",
                    "resource": patient_resource,
                    "request": {
                        "method": "POST",
                        "url": "Patient"
                    }
                },
                {
                    "fullUrl": f"urn:uuid:coverage-{request.patientId}",
                    "resource": coverage_resource,
                    "request": {
                        "method": "POST",
                        "url": "Coverage"
                    }
                },
                {
                    "fullUrl": f"urn:uuid:claim-{request.claimId}",
                    "resource": claim_resource,
                    "request": {
                        "method": "POST",
                        "url": "Claim"
                    }
                }
            ]
        }
        
        # Check NPHIES compliance
        nphies_compliant = len(warnings) == 0
        
        return NPHIESMappingResponse(
            bundle=bundle,
            nphiesCompliant=nphies_compliant,
            mappingWarnings=warnings
        )
    
    def _create_patient_resource(
        self,
        patient_id: str,
        warnings: List[str]
    ) -> Dict[str, Any]:
        """Create FHIR Patient resource"""
        # Validate Saudi National ID format (10 digits)
        if not re.match(r'^\d{10}$', patient_id):
            warnings.append(f"Patient ID '{patient_id}' is not a valid 10-digit Saudi National ID")
        
        return {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [
                {
                    "system": "http://nphies.sa/identifier/nationalid",
                    "value": patient_id
                }
            ],
            "name": [
                {
                    "use": "official",
                    "text": "Patient Name Placeholder"
                }
            ],
            "gender": "unknown",
            "birthDate": "1990-01-01"
        }
    
    def _create_claim_resource(
        self,
        request: NPHIESMappingRequest,
        warnings: List[str]
    ) -> Dict[str, Any]:
        """Create FHIR Claim resource"""
        # Map diagnosis codes to FHIR
        diagnosis = []
        for idx, icd_code in enumerate(request.icdCodes, start=1):
            diagnosis.append({
                "sequence": idx,
                "diagnosisCodeableConcept": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": icd_code
                        }
                    ]
                }
            })
        
        # Map procedure codes to claim items
        items = []
        for idx, cpt_code in enumerate(request.cptCodes, start=1):
            items.append({
                "sequence": idx,
                "productOrService": {
                    "coding": [
                        {
                            "system": "http://www.ama-assn.org/go/cpt",
                            "code": cpt_code
                        }
                    ]
                },
                "unitPrice": {
                    "value": request.totalAmount / len(request.cptCodes),
                    "currency": "SAR"
                }
            })
        
        # Create claim resource
        claim = {
            "resourceType": "Claim",
            "id": request.claimId,
            "status": "active",
            "type": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                        "code": "institutional"
                    }
                ]
            },
            "patient": {
                "reference": f"urn:uuid:patient-{request.patientId}"
            },
            "created": datetime.utcnow().isoformat() + "Z",
            "provider": {
                "reference": f"Organization/{request.providerId}"
            },
            "priority": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/processpriority",
                        "code": "normal"
                    }
                ]
            },
            "insurance": [
                {
                    "sequence": 1,
                    "focal": True,
                    "coverage": {
                        "reference": f"urn:uuid:coverage-{request.patientId}"
                    }
                }
            ],
            "diagnosis": diagnosis,
            "item": items
        }
        
        # Add pre-authorization if provided
        if request.documentation and request.documentation.preAuthNumber:
            claim["preAuthRef"] = [request.documentation.preAuthNumber]
        
        return claim
    
    def _create_coverage_resource(
        self,
        patient_id: str,
        payer_id: str,
        warnings: List[str]
    ) -> Dict[str, Any]:
        """Create FHIR Coverage resource"""
        return {
            "resourceType": "Coverage",
            "id": f"coverage-{patient_id}",
            "status": "active",
            "subscriber": {
                "reference": f"urn:uuid:patient-{patient_id}"
            },
            "beneficiary": {
                "reference": f"urn:uuid:patient-{patient_id}"
            },
            "payor": [
                {
                    "reference": f"Organization/{payer_id}"
                }
            ]
        }
