"""
ML Inference Client

Client for communicating with ML service for denial risk scoring.
"""
import httpx
import logging
from typing import Dict, Any

from .models import ClaimValidationRequest
from .config import Settings

logger = logging.getLogger(__name__)


class MLInferenceClient:
    """Client for ML inference service"""
    
    def __init__(self, http_client: httpx.AsyncClient, settings: Settings):
        self.http_client = http_client
        self.settings = settings
        self.base_url = settings.ml_inference_url
    
    async def predict_denial_risk(self, request: ClaimValidationRequest) -> float:
        """
        Predict denial risk score for claim.
        
        Returns risk score between 0-100.
        """
        if not self.settings.enable_ml_scoring:
            logger.info("ML scoring disabled, returning default risk score")
            return 0.0
        
        try:
            # Prepare features for ML model
            features = self._extract_features(request)
            
            # Call ML inference service
            response = await self.http_client.post(
                f"{self.base_url}/api/v1/predict/denial-risk",
                json=features,
                timeout=self.settings.ml_timeout
            )
            response.raise_for_status()
            
            result = response.json()
            risk_score = result.get("risk_score", 0.0)
            
            logger.info(f"ML prediction: risk_score={risk_score:.2f}")
            return risk_score
            
        except httpx.HTTPError as e:
            logger.error(f"ML inference failed: {e}")
            # Return default risk score on failure (fail open)
            return 50.0  # Medium risk as default
        except Exception as e:
            logger.error(f"Unexpected error in ML inference: {e}", exc_info=True)
            return 50.0
    
    def _extract_features(self, request: ClaimValidationRequest) -> Dict[str, Any]:
        """Extract features for ML model"""
        return {
            "payer_id": request.payer_id,
            "provider_id": request.provider_id,
            "total_amount": request.total_amount,
            "num_icd_codes": len(request.icd_codes),
            "num_cpt_codes": len(request.cpt_codes),
            "has_documentation": request.documentation is not None,
            "has_pre_auth": (
                request.documentation and 
                request.documentation.pre_auth_number is not None
            ),
            # Add more features as needed
        }
