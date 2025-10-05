# FHIR Gateway Service

**Owner:** Platform Team  
**Status:** 🟢 Active Development  
**Language:** Python 3.12 + FastAPI  
**Port:** 8001

## Overview

The FHIR Gateway Service provides FHIR R4 conformance validation and NPHIES MDS (Minimum Data Set) mapping. It acts as a validation layer between internal claim data and external FHIR-compliant systems, ensuring all outbound data meets NPHIES requirements.

## Features

- **FHIR R4 Conformance Testing:** Validates resources against FHIR R4 profiles
- **NPHIES MDS Mapping:** Converts internal claim models to NPHIES FHIR extensions
- **Resource Validation:** Supports Patient, Claim, Coverage, Organization, Practitioner
- **Bundle Operations:** Creates FHIR transaction bundles for claim submission
- **Terminology Validation:** Validates code systems (ICD-10, CPT, SNOMED CT)
- **Health Checks:** MongoDB and NPHIES API connectivity monitoring

## API Endpoints

### POST /api/v1/fhir/validate
Validates a FHIR resource against R4 profile and NPHIES MDS requirements.

**Request:**
```json
{
  "resourceType": "Claim",
  "resource": {
    "resourceType": "Claim",
    "id": "claim-001",
    "status": "active",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "institutional"
      }]
    },
    "patient": { "reference": "Patient/patient-001" },
    "created": "2024-01-15T10:30:00Z",
    "provider": { "reference": "Organization/provider-001" },
    "priority": { "coding": [{ "code": "normal" }] },
    "insurance": [{
      "sequence": 1,
      "focal": true,
      "coverage": { "reference": "Coverage/coverage-001" }
    }],
    "item": [{
      "sequence": 1,
      "productOrService": {
        "coding": [{
          "system": "http://www.ama-assn.org/go/cpt",
          "code": "99213"
        }]
      },
      "unitPrice": { "value": 500.0, "currency": "SAR" }
    }]
  },
  "profile": "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/claim"
}
```

**Response:**
```json
{
  "validationId": "val_1234567890",
  "isValid": true,
  "conformanceIssues": [],
  "nphiesMdsCompliant": true,
  "terminologyIssues": [],
  "profile": "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/claim",
  "timestamp": "2024-01-15T10:30:05Z"
}
```

### POST /api/v1/fhir/map-to-nphies
Converts internal claim model to NPHIES-compliant FHIR Bundle.

**Request:**
```json
{
  "claimId": "CLM-2024-001",
  "patientId": "1234567890",
  "payerId": "PAYER_A",
  "providerId": "HNH_UNAIZAH",
  "serviceDate": "2024-01-15",
  "icdCodes": ["J45.0"],
  "cptCodes": ["99213"],
  "totalAmount": 500.0
}
```

**Response:**
```json
{
  "bundle": {
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      { "resource": { "resourceType": "Patient", "..." }},
      { "resource": { "resourceType": "Claim", "..." }}
    ]
  },
  "nphiesCompliant": true,
  "mappingWarnings": []
}
```

### GET /health
Service health check.

## Architecture

```
┌──────────────┐
│ Claim System │
└──────┬───────┘
       │ POST /validate
       │
┌──────▼─────────────┐        ┌────────────────┐
│  FHIR Gateway      │───────►│ FHIR Validator │
│  (FastAPI)         │        │ (fhir.resources)│
└──────┬─────────────┘        └────────────────┘
       │
       │ Validation Report
       │
┌──────▼─────────────┐        ┌────────────────┐
│ NPHIES MDS Mapper  │───────►│  MongoDB       │
│                    │        │  (audit logs)  │
└────────────────────┘        └────────────────┘
```

## Dependencies

- **FastAPI:** Web framework
- **fhir.resources:** FHIR R4 Python models and validators
- **pydantic:** Data validation
- **httpx:** Async HTTP client for NPHIES API
- **motor:** Async MongoDB driver

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `NPHIES_BASE_URL` | NPHIES API base URL | `https://nphies.sa/fhir` |
| `NPHIES_API_KEY` | NPHIES API authentication key | - |
| `TERMINOLOGY_SERVER` | FHIR terminology server URL | `https://tx.fhir.org` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Deployment

**Resources:**
- CPU: 1 core
- Memory: 2GB
- Replicas: 3-5 (autoscale)

**Health Check:**
- Path: `/health`
- Interval: 30s
- Timeout: 5s

**Secrets:**
- `nphies-api-key`: NPHIES API authentication credentials

## Testing

```bash
# Run unit tests
pytest tests/

# Test FHIR validation
curl -X POST http://localhost:8001/api/v1/fhir/validate \
  -H "Content-Type: application/json" \
  -d @test-claim.json

# Test NPHIES mapping
curl -X POST http://localhost:8001/api/v1/fhir/map-to-nphies \
  -H "Content-Type: application/json" \
  -d @test-claim-data.json
```

## Related Services

- **Claims Scrubbing Service:** Validates claims before FHIR conversion
- **Audit Service:** Logs all FHIR validation events
- **NPHIES Integration:** External FHIR API for KSA healthcare
