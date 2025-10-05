# Claims Scrubbing Service

**Purpose:** AI-powered pre-submission validation ensuring NPHIES compliance and denial risk assessment

## Overview

The Claims Scrubbing Service validates all claim elements against NPHIES Minimum Data Set (MDS), payer-specific rules, and historical denial patterns before submission. It provides real-time Denial Risk Scores and auto-coding suggestions.

## Features

- ✅ NPHIES MDS validation (ICD-10, CPT codes, patient eligibility)
- ✅ Payer rule engine integration
- ✅ ML-based Denial Risk Score (0-100%)
- ✅ Auto-coding suggestions via NLP
- ✅ Real-time eligibility verification
- ✅ Duplicate claim detection

## API Endpoints

### POST /api/v1/claims/validate

Validates claim data against all rules and returns risk assessment.

**Request:**
```json
{
  "patient_id": "1234567890",
  "payer_id": "PAYER_A",
  "service_date": "2025-10-01",
  "icd_codes": ["J45.0", "J45.9"],
  "cpt_codes": ["99213", "94060"],
  "total_amount": 850.00,
  "provider_id": "HNH_UNAIZAH",
  "documentation": {
    "physician_notes": "Patient presents with asthma exacerbation...",
    "pre_auth_number": "AUTH123456"
  }
}
```

**Response:**
```json
{
  "validation_id": "val_abc123xyz",
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
      "code": "ELIGIBILITY_DATE_MISMATCH",
      "message": "Service date falls within 5 days of policy expiry",
      "field": "service_date",
      "suggestion": "Verify patient eligibility for service date"
    }
  ],
  "recommendations": [
    {
      "type": "documentation",
      "message": "Consider adding spirometry test results to support medical necessity"
    }
  ],
  "auto_coding": {
    "suggested_icd": ["J45.901"],
    "suggested_cpt": [],
    "confidence": 0.87
  }
}
```

### POST /api/v1/claims/batch-validate

Batch validation for multiple claims.

### GET /api/v1/claims/validation-history

Retrieve validation history for analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FastAPI Router (/api/v1/claims)                         │
└─────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐    ┌──────────┐    ┌──────────┐
│ NPHIES │    │  Payer   │    │   ML     │
│ Validator│  │  Rules   │    │ Scoring  │
│        │    │  Engine  │    │ Service  │
└────────┘    └──────────┘    └──────────┘
    │               │               │
    └───────────────┴───────────────┘
                    ▼
        ┌───────────────────────┐
        │  Validation Engine    │
        │  (orchestrates checks)│
        └───────────────────────┘
                    │
                    ▼
            ┌─────────────┐
            │  MongoDB    │
            │  (history)  │
            └─────────────┘
```

## Dependencies

- `fastapi >= 0.115.0`
- `pydantic >= 2.10.0`
- `httpx >= 0.27.0` (async HTTP client for external APIs)
- `redis >= 5.0.0` (caching)
- `shared-models` (internal package)

## Configuration

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    service_name: str = "claims-scrubbing"
    version: str = "1.0.0"
    
    # Database
    mongodb_uri: str
    mongodb_database: str = "brainsait"
    
    # Redis
    redis_uri: str
    redis_ttl: int = 3600  # 1 hour cache
    
    # External APIs
    nphies_api_url: str
    nphies_api_key: str
    
    # ML Service
    ml_inference_url: str = "http://ml-inference-service:8000"
    
    # Feature flags
    enable_ml_scoring: bool = True
    enable_auto_coding: bool = True
    
    class Config:
        env_file = ".env"
        env_prefix = "CLAIMS_SCRUBBING_"
```

## Deployment

See `infrastructure/kubernetes/services/claims-scrubbing/` for K8s manifests.

**Resources:**
- CPU: 2 cores
- Memory: 4Gi
- Replicas: 3 (autoscaling 3-10)

## Monitoring

- **Health Check:** `GET /health`
- **Metrics:** `GET /metrics` (Prometheus format)
- **Key Metrics:**
  - `claims_validated_total{status}`: Total validations by outcome
  - `denial_risk_score_histogram`: Distribution of risk scores
  - `validation_duration_seconds`: P50/P95/P99 latencies
  - `nphies_api_calls_total{status}`: External API call tracking

## Testing

```bash
# Run unit tests
cd services/claims-scrubbing
python -m pytest tests/ -v --cov=src --cov-report=term-missing

# Run integration tests (requires test MongoDB/Redis)
python -m pytest tests/integration/ -v --integration

# Load test
locust -f tests/load/locustfile.py --host=http://localhost:8000
```

## Next Steps

1. Implement payer-specific rule engine (OPA or Drools)
2. Integrate ML inference service for denial risk scoring
3. Build NLP pipeline for auto-coding from physician notes
4. Add eligibility verification via NPHIES API
5. Implement duplicate claim detection logic
