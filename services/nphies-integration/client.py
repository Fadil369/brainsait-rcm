"""
BrainSAIT: NPHIES Integration Client
Saudi National Platform for Health Insurance Exchange Services
"""

import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NPHIESConfig(BaseModel):
    """NPHIES API configuration"""
    base_url: str = os.getenv("NPHIES_BASE_URL", "https://api.nphies.sa/v1")
    api_key: str = os.getenv("NPHIES_API_KEY", "")
    timeout: int = 30


class NPHIESClient:
    """Client for NPHIES API integration"""

    def __init__(self, config: Optional[NPHIESConfig] = None):
        self.config = config or NPHIESConfig()

        if not self.config.api_key:
            logger.warning("NPHIES API key not configured. Integration disabled.")
            self.enabled = False
        else:
            self.enabled = True

        self.client = httpx.AsyncClient(
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )

    async def submit_claim(self, claim_data: Dict) -> Dict:
        """
        Submit claim to NPHIES
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "NPHIES integration not configured"
            }

        try:
            response = await self.client.post("/Claim", json=claim_data)
            response.raise_for_status()

            result = response.json()

            logger.info(f"Claim submitted to NPHIES: {result.get('id')}")

            return {
                "success": True,
                "nphies_reference": result.get("id"),
                "status": result.get("status"),
                "created": result.get("created"),
                "response": result
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"NPHIES claim submission failed: {e.response.text}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except Exception as e:
            logger.exception(f"Unexpected error submitting claim: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_claim_response(self, nphies_reference: str) -> Dict:
        """
        Get claim response from NPHIES
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "NPHIES integration not configured"
            }

        try:
            response = await self.client.get(f"/ClaimResponse/{nphies_reference}")
            response.raise_for_status()

            result = response.json()

            return {
                "success": True,
                "claim_response": result,
                "outcome": result.get("outcome"),
                "status": result.get("status")
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to get claim response: {e.response.text}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except Exception as e:
            logger.exception(f"Unexpected error getting claim response: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def submit_appeal(self, appeal_data: Dict) -> Dict:
        """
        Submit appeal for rejected claim
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "NPHIES integration not configured"
            }

        try:
            # NPHIES uses Task resource for appeals
            task_resource = {
                "resourceType": "Task",
                "status": "requested",
                "intent": "order",
                "priority": "routine",
                "code": {
                    "coding": [{
                        "system": "http://nphies.sa/terminology/task-type",
                        "code": "appeal"
                    }]
                },
                "focus": {
                    "reference": f"Claim/{appeal_data.get('claim_id')}"
                },
                "for": {
                    "reference": f"Patient/{appeal_data.get('patient_id')}"
                },
                "authoredOn": datetime.now(timezone.utc).isoformat(),
                "input": appeal_data.get('supporting_info', [])
            }

            response = await self.client.post("/Task", json=task_resource)
            response.raise_for_status()

            result = response.json()

            logger.info(f"Appeal submitted to NPHIES: {result.get('id')}")

            return {
                "success": True,
                "appeal_reference": result.get("id"),
                "status": result.get("status"),
                "response": result
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"NPHIES appeal submission failed: {e.response.text}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except Exception as e:
            logger.exception(f"Unexpected error submitting appeal: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def check_eligibility(self, patient_id: str, insurance_id: str) -> Dict:
        """
        Check patient eligibility with insurance
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "NPHIES integration not configured"
            }

        try:
            eligibility_request = {
                "resourceType": "CoverageEligibilityRequest",
                "status": "active",
                "purpose": ["validation"],
                "patient": {
                    "reference": f"Patient/{patient_id}"
                },
                "insurance": [{
                    "coverage": {
                        "reference": f"Coverage/{insurance_id}"
                    }
                }],
                "created": datetime.now(timezone.utc).isoformat()
            }

            response = await self.client.post(
                "/CoverageEligibilityRequest",
                json=eligibility_request
            )
            response.raise_for_status()

            result = response.json()

            return {
                "success": True,
                "eligible": result.get("outcome") == "complete",
                "response": result
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Eligibility check failed: {e.response.text}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except Exception as e:
            logger.exception(f"Unexpected error checking eligibility: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_provider_info(self, provider_id: str) -> Dict:
        """
        Get provider/physician information from NPHIES
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "NPHIES integration not configured"
            }

        try:
            response = await self.client.get(f"/Practitioner/{provider_id}")
            response.raise_for_status()

            result = response.json()

            return {
                "success": True,
                "provider": result
            }

        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Convenience functions

async def submit_claim_to_nphies(claim_data: Dict) -> Dict:
    """Submit claim to NPHIES"""
    client = NPHIESClient()
    try:
        result = await client.submit_claim(claim_data)
        return result
    finally:
        await client.close()


async def get_nphies_claim_response(nphies_reference: str) -> Dict:
    """Get claim response from NPHIES"""
    client = NPHIESClient()
    try:
        result = await client.get_claim_response(nphies_reference)
        return result
    finally:
        await client.close()


async def submit_nphies_appeal(appeal_data: Dict) -> Dict:
    """Submit appeal to NPHIES"""
    client = NPHIESClient()
    try:
        result = await client.submit_appeal(appeal_data)
        return result
    finally:
        await client.close()