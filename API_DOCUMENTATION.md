# BrainSAIT RCM API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:8000` (Development)
**Production URL:** `https://api.brainsait.com`

## Table of Contents

1. [Authentication](#authentication)
2. [Rejections Management](#rejections-management)
3. [AI-Powered Features](#ai-powered-features)
4. [FHIR Validation](#fhir-validation)
5. [NPHIES Integration](#nphies-integration)
6. [Appeals Management](#appeals-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Compliance Letters](#compliance-letters)
9. [Notifications](#notifications)
10. [Audit Logs](#audit-logs)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "admin@brainsait.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "user_id": "user_123",
    "username": "admin",
    "email": "admin@brainsait.com",
    "role": "ADMIN",
    "full_name": "Admin User"
  }
}
```

### GET /api/auth/me

Get current user information (requires authentication).

**Response:**
```json
{
  "user_id": "user_123",
  "username": "admin",
  "role": "ADMIN",
  "email": "admin@brainsait.com"
}
```

---

## Rejections Management

### GET /api/rejections/current-month

Get all rejections for the current month.

**Response:**
```json
[
  {
    "id": "REJ-001",
    "tpa_name": "TPA Company",
    "insurance_company": "Insurance Co",
    "branch": "Main Branch",
    "billed_amount": {"net": 1000, "vat": 150, "total": 1150},
    "rejected_amount": {"net": 500, "vat": 75, "total": 575},
    "rejection_received_date": "2024-01-15T10:00:00Z",
    "reception_mode": "NPHIES",
    "initial_rejection_rate": 50.0,
    "within_30_days": true,
    "status": "PENDING_REVIEW"
  }
]
```

### POST /api/rejections

Create a new rejection record.

**Request:**
```json
{
  "id": "REJ-002",
  "tpa_name": "TPA Company",
  "insurance_company": "Insurance Co",
  "branch": "Branch 2",
  "billed_amount": {"net": 2000, "vat": 300, "total": 2300},
  "rejected_amount": {"net": 1000, "vat": 150, "total": 1150},
  "rejection_received_date": "2024-01-20T10:00:00Z",
  "reception_mode": "PORTAL",
  "initial_rejection_rate": 50.0,
  "within_30_days": true,
  "status": "PENDING_REVIEW",
  "audit_log": []
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "created"
}
```

---

## AI-Powered Features

### POST /api/ai/fraud-detection

Run AI-powered fraud detection analysis on claims.

**Request:**
```json
{
  "claims": [
    {
      "id": "CLM-001",
      "physician_id": "DOC-001",
      "patient_id": "PAT-001",
      "service_code": "SRV-001",
      "service_date": "2024-01-15",
      "billed_amount": 1000.0,
      "complexity_level": "HIGH"
    }
  ],
  "historical_data": [],
  "facility_schedules": {}
}
```

**Response:**
```json
{
  "alerts": [
    {
      "type": "DUPLICATE",
      "severity": "HIGH",
      "physician_id": "DOC-001",
      "description": "Service SRV-001 billed 3 times on same date",
      "detected_at": "2024-01-20T10:00:00Z"
    }
  ],
  "total_alerts": 1,
  "alerts_by_severity": {"HIGH": 1},
  "physician_risks": [
    {
      "physician_id": "DOC-001",
      "risk_score": 75.5,
      "risk_level": "HIGH",
      "requires_investigation": true
    }
  ]
}
```

### POST /api/ai/predictive-analytics

Generate predictive analytics forecasts.

**Request:**
```json
{
  "historical_data": [
    {
      "rejection_received_date": "2024-01-01T00:00:00Z",
      "initial_rejection_rate": 15.0,
      "recovery_rate": 60.0
    }
  ],
  "forecast_days": 30
}
```

**Response:**
```json
{
  "rejection_forecast": {
    "forecast": [...],
    "current_rate": 15.0,
    "predicted_average": 16.2,
    "trend": "increasing"
  },
  "volume_forecast": {
    "predicted_average": 450,
    "predicted_total": 13500
  }
}
```

### GET /api/ai/physician-risk/{physician_id}

Get fraud risk assessment for a specific physician.

**Response:**
```json
{
  "physician_id": "DOC-001",
  "risk_score": 75.5,
  "risk_level": "HIGH",
  "alert_count": 5,
  "claim_count": 100,
  "requires_investigation": true,
  "requires_training": true
}
```

---

## FHIR Validation

### POST /api/fhir/validate

Validate FHIR R4 resources.

**Request:**
```json
{
  "resource_type": "ClaimResponse",
  "data": {
    "resourceType": "ClaimResponse",
    "status": "active",
    "type": {
      "coding": [{"system": "...", "code": "institutional"}]
    },
    "use": "claim",
    "patient": {"reference": "Patient/123"},
    "insurer": {"display": "Insurance Co"},
    "outcome": "error"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "resource_type": "ClaimResponse",
  "id": "claim_resp_123",
  "status": "active",
  "outcome": "error",
  "saudi_validation": {
    "valid": true,
    "errors": [],
    "warnings": ["No NPHIES reference found"]
  }
}
```

---

## NPHIES Integration

### POST /api/nphies/submit-claim

Submit claim to NPHIES platform.

**Request:**
```json
{
  "claim_data": {
    "resourceType": "Claim",
    "status": "active",
    "type": {...},
    "patient": {...},
    "provider": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "nphies_reference": "NPHIES-123456",
  "status": "active",
  "created": "2024-01-20T10:00:00Z"
}
```

### POST /api/nphies/submit-appeal

Submit appeal to NPHIES.

**Request:**
```json
{
  "claim_id": "CLM-001",
  "patient_id": "PAT-001",
  "supporting_info": [...]
}
```

### GET /api/nphies/claim-response/{nphies_reference}

Get claim response from NPHIES.

---

## Appeals Management

### POST /api/appeals

Create new appeal for rejected claim.

**Request:**
```json
{
  "rejection_id": "REJ-001",
  "reason": "Documentation error",
  "supporting_documents": ["doc1.pdf", "doc2.pdf"],
  "notes": {
    "ar": "ملاحظات بالعربية",
    "en": "Notes in English"
  }
}
```

**Response:**
```json
{
  "id": "appeal_123",
  "status": "created"
}
```

### GET /api/appeals

Get all appeals with optional status filter.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, UNDER_REVIEW, APPROVED, REJECTED)

---

## Analytics & Reporting

### GET /api/analytics/dashboard

Get comprehensive dashboard analytics.

**Response:**
```json
{
  "period": "current_month",
  "metrics": {
    "total_claims": 150,
    "total_billed": 500000.0,
    "total_rejected": 75000.0,
    "rejection_rate": 15.0,
    "recovery_rate": 60.0,
    "overdue_letters": 3,
    "within_30_days_compliance": 145
  },
  "fraud_alerts_count": 2
}
```

### GET /api/analytics/trends

Get rejection and recovery trends.

**Query Parameters:**
- `days` (optional, default: 30): Number of days to analyze

**Response:**
```json
{
  "start_date": "2023-12-21T00:00:00Z",
  "end_date": "2024-01-20T00:00:00Z",
  "daily_trends": {
    "2024-01-20": {
      "count": 10,
      "rejected_amount": 5000.0,
      "recovered_count": 6
    }
  }
}
```

---

## Compliance Letters

### GET /api/compliance/letters/pending

Get all pending compliance letters.

### POST /api/compliance/letters

Create new compliance letter.

**Request:**
```json
{
  "type": "INITIAL_NOTIFICATION",
  "recipient": "tpa@insurance.com",
  "subject": {
    "ar": "إشعار أولي",
    "en": "Initial Notification"
  },
  "body": {
    "ar": "نص الخطاب بالعربية",
    "en": "Letter body in English"
  },
  "due_date": "2024-02-20T00:00:00Z",
  "total_amount": 50000.0,
  "claim_references": ["CLM-001", "CLM-002"]
}
```

---

## Notifications

### POST /api/notifications/whatsapp

Send WhatsApp notification.

**Request:**
```json
{
  "to_number": "+966501234567",
  "notification_type": "rejection_notification",
  "locale": "ar",
  "data": {
    "rejection_count": 5,
    "total_amount": 10000.0,
    "rejection_rate": 15.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "message_sid": "SM123456789",
  "status": "sent",
  "sent_at": "2024-01-20T10:00:00Z"
}
```

---

## Audit Logs

### GET /api/audit/user/{user_id}

Get audit trail for specific user.

**Query Parameters:**
- `limit` (optional, default: 100): Number of records to return

**Response:**
```json
[
  {
    "timestamp": "2024-01-20T10:00:00Z",
    "event_type": "ACCESS",
    "action": "READ",
    "resource_type": "Rejection",
    "resource_id": "REJ-001",
    "phi_accessed": true,
    "ip_address": "192.168.1.1"
  }
]
```

### GET /api/audit/suspicious

Detect suspicious activity patterns.

**Response:**
```json
{
  "suspicious_events": [
    {
      "type": "MULTIPLE_FAILED_LOGINS",
      "severity": "HIGH",
      "count": 7,
      "description": "7 failed login attempts in last 24 hours"
    }
  ],
  "count": 1
}
```

---

## Monitoring Endpoints

### GET /health

Health check endpoint for load balancers.

### GET /metrics

Prometheus metrics endpoint for monitoring.

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Rate Limiting

API requests are rate-limited to:
- **Authenticated users**: 1000 requests/hour
- **Unauthenticated requests**: 100 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

---

## SDK & Client Libraries

Coming soon:
- Python SDK
- JavaScript/TypeScript SDK
- Mobile SDKs (iOS, Android)

---

## Support

For API support, contact: api-support@brainsait.com

**Documentation Version:** 1.0.0
**Last Updated:** January 2024