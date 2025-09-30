"""
BrainSAIT: FHIR R4 Validation Service
Validates claim data against FHIR R4 ClaimResponse resources
"""

import logging
from typing import Dict, List, Optional

from fhir.resources.claimresponse import ClaimResponse
from fhir.resources.claim import Claim
from fhir.resources.patient import Patient
from fhir.resources.organization import Organization
from pydantic import ValidationError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FHIRValidator:
    """FHIR R4 validator for healthcare claims"""

    def __init__(self):
        self.supported_resources = [
            'ClaimResponse',
            'Claim',
            'Patient',
            'Organization',
            'Practitioner'
        ]

    def validate_claim_response(self, data: Dict) -> Dict:
        """
        Validate ClaimResponse resource
        Returns validation result with errors if any
        """
        try:
            # Attempt to parse as FHIR ClaimResponse
            claim_response = ClaimResponse(**data)

            # Validate required fields
            errors = []

            if not claim_response.status:
                errors.append("ClaimResponse.status is required")

            if not claim_response.type:
                errors.append("ClaimResponse.type is required")

            if not claim_response.use:
                errors.append("ClaimResponse.use is required")

            if not claim_response.patient:
                errors.append("ClaimResponse.patient reference is required")

            if not claim_response.insurer:
                errors.append("ClaimResponse.insurer reference is required")

            if not claim_response.outcome:
                errors.append("ClaimResponse.outcome is required")

            # Validate items
            if claim_response.item:
                for idx, item in enumerate(claim_response.item):
                    if not item.itemSequence:
                        errors.append(f"Item {idx}: itemSequence is required")

                    if not item.adjudication:
                        errors.append(f"Item {idx}: at least one adjudication is required")

            if errors:
                return {
                    "valid": False,
                    "resource_type": "ClaimResponse",
                    "errors": errors
                }

            return {
                "valid": True,
                "resource_type": "ClaimResponse",
                "id": claim_response.id,
                "status": claim_response.status,
                "outcome": claim_response.outcome
            }

        except ValidationError as e:
            logger.error(f"FHIR validation failed: {e}")
            return {
                "valid": False,
                "resource_type": "ClaimResponse",
                "errors": [str(err) for err in e.errors()]
            }
        except Exception as e:
            logger.exception(f"Unexpected validation error: {e}")
            return {
                "valid": False,
                "resource_type": "ClaimResponse",
                "errors": [f"Unexpected error: {str(e)}"]
            }

    def validate_claim(self, data: Dict) -> Dict:
        """Validate Claim resource"""
        try:
            claim = Claim(**data)

            errors = []

            if not claim.status:
                errors.append("Claim.status is required")

            if not claim.type:
                errors.append("Claim.type is required")

            if not claim.use:
                errors.append("Claim.use is required")

            if not claim.patient:
                errors.append("Claim.patient reference is required")

            if not claim.provider:
                errors.append("Claim.provider reference is required")

            if not claim.priority:
                errors.append("Claim.priority is required")

            if errors:
                return {
                    "valid": False,
                    "resource_type": "Claim",
                    "errors": errors
                }

            return {
                "valid": True,
                "resource_type": "Claim",
                "id": claim.id,
                "status": claim.status
            }

        except ValidationError as e:
            return {
                "valid": False,
                "resource_type": "Claim",
                "errors": [str(err) for err in e.errors()]
            }
        except Exception as e:
            return {
                "valid": False,
                "resource_type": "Claim",
                "errors": [f"Unexpected error: {str(e)}"]
            }

    def validate_patient(self, data: Dict) -> Dict:
        """Validate Patient resource"""
        try:
            patient = Patient(**data)

            errors = []

            if not patient.identifier:
                errors.append("Patient.identifier is required (at least one)")

            if not patient.name:
                errors.append("Patient.name is required (at least one)")

            if errors:
                return {
                    "valid": False,
                    "resource_type": "Patient",
                    "errors": errors
                }

            return {
                "valid": True,
                "resource_type": "Patient",
                "id": patient.id
            }

        except ValidationError as e:
            return {
                "valid": False,
                "resource_type": "Patient",
                "errors": [str(err) for err in e.errors()]
            }

    def validate_saudi_specific_codes(self, data: Dict) -> Dict:
        """
        Validate Saudi-specific codes and requirements
        - NPHIES codes
        - Saudi insurance codes
        - Ministry of Health codes
        """
        errors = []
        warnings = []

        # Check for NPHIES reference number
        if 'identifier' in data:
            has_nphies_ref = any(
                identifier.get('system') == 'http://nphies.sa'
                for identifier in data.get('identifier', [])
            )
            if not has_nphies_ref:
                warnings.append("No NPHIES reference identifier found")

        # Check for Saudi Riyal currency
        if 'total' in data:
            total = data.get('total', {})
            if total.get('currency') != 'SAR':
                errors.append("Currency must be SAR (Saudi Riyal)")

        # Check for VAT (15% in Saudi Arabia)
        # This is typically in extensions or adjudication
        has_vat = False
        if 'item' in data:
            for item in data.get('item', []):
                if 'adjudication' in item:
                    for adj in item['adjudication']:
                        if adj.get('category', {}).get('coding', [{}])[0].get('code') == 'tax':
                            has_vat = True
                            break

        if not has_vat:
            warnings.append("No VAT information found (15% required in Saudi Arabia)")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def convert_rejection_to_fhir(self, rejection_data: Dict) -> Dict:
        """
        Convert BrainSAIT rejection record to FHIR ClaimResponse
        """
        try:
            claim_response = {
                "resourceType": "ClaimResponse",
                "status": "active",
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                        "code": "institutional"
                    }]
                },
                "use": "claim",
                "patient": {
                    "reference": f"Patient/{rejection_data.get('patient_id', 'unknown')}"
                },
                "created": rejection_data.get('rejection_received_date'),
                "insurer": {
                    "display": rejection_data.get('insurance_company')
                },
                "outcome": "error",  # Rejection
                "item": [],
                "total": {
                    "category": {
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/adjudication",
                            "code": "submitted"
                        }]
                    },
                    "amount": {
                        "value": rejection_data.get('billed_amount', {}).get('total', 0),
                        "currency": "SAR"
                    }
                }
            }

            return claim_response

        except Exception as e:
            logger.exception(f"Failed to convert rejection to FHIR: {e}")
            raise


def validate_fhir_resource(resource_type: str, data: Dict) -> Dict:
    """
    Main validation function
    """
    validator = FHIRValidator()

    if resource_type == "ClaimResponse":
        result = validator.validate_claim_response(data)
    elif resource_type == "Claim":
        result = validator.validate_claim(data)
    elif resource_type == "Patient":
        result = validator.validate_patient(data)
    else:
        return {
            "valid": False,
            "errors": [f"Unsupported resource type: {resource_type}"]
        }

    # Add Saudi-specific validation
    saudi_validation = validator.validate_saudi_specific_codes(data)
    result["saudi_validation"] = saudi_validation

    return result