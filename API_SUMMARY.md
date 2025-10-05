# 📚 BrainSAIT RCM - API Summary & Integration Guide

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Production Ready

## 🎯 Quick Reference

### Base URLs
- **Production API:** `https://brainsait-api.onrender.com`
- **Local Development:** `http://localhost:8000`

### Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### POST `/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### POST `/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "organization": "HNH Hospital"
}
```

---

## 📊 Rejection Management Endpoints

### GET `/api/rejections`
List all rejection records with optional filtering.

**Query Parameters:**
- `tpa_name` (optional): Filter by TPA name
- `status` (optional): Filter by status (pending, under_appeal, recovered, final_rejection)
- `skip` (optional): Number of records to skip (pagination)
- `limit` (optional): Max records to return (default: 100)

**Response:**
```json
{
  "total": 150,
  "data": [
    {
      "id": "rej_123",
      "tpa_name": "Tawuniya",
      "insurance_company": "Saudi Arabian Insurance",
      "branch": "Riyadh Main",
      "billed_amount": {
        "net": 5000.0,
        "vat": 750.0,
        "total": 5750.0
      },
      "rejected_amount": {
        "net": 1000.0,
        "vat": 150.0,
        "total": 1150.0
      },
      "rejection_received_date": "2024-12-01T10:30:00Z",
      "reception_mode": "NPHIES",
      "initial_rejection_rate": 20.0,
      "within_30_days": true,
      "status": "pending_review"
    }
  ]
}
```

### POST `/api/rejections`
Create a new rejection record.

**Request:**
```json
{
  "tpa_name": "Tawuniya",
  "insurance_company": "Saudi Arabian Insurance",
  "branch": "Riyadh Main",
  "billed_amount": {
    "net": 5000.0,
    "vat": 750.0,
    "total": 5750.0
  },
  "rejected_amount": {
    "net": 1000.0,
    "vat": 150.0,
    "total": 1150.0
  },
  "rejection_received_date": "2024-12-01T10:30:00Z",
  "reception_mode": "NPHIES"
}
```

### GET `/api/rejections/{id}`
Get details of a specific rejection record.

### PUT `/api/rejections/{id}`
Update a rejection record (including status changes).

### DELETE `/api/rejections/{id}`
Delete a rejection record.

---

## 📧 Compliance Letter Endpoints

### POST `/api/compliance-letters`
Generate a compliance letter.

**Request:**
```json
{
  "type": "INITIAL_NOTIFICATION",
  "recipient": "insurance.company@example.com",
  "claim_references": ["CLM-2024-001", "CLM-2024-002"],
  "total_amount": 10000.0,
  "due_date": "2024-12-31T23:59:59Z"
}
```

### GET `/api/compliance-letters`
List all compliance letters.

### GET `/api/compliance-letters/{id}`
Get details of a specific letter.

---

## 📈 Analytics Endpoints

### GET `/api/analytics/dashboard`
Get dashboard analytics summary.

**Response:**
```json
{
  "total_rejections": 150,
  "total_rejected_amount": 175000.0,
  "average_rejection_rate": 18.5,
  "rejections_within_30_days": 145,
  "appeals_pending": 25,
  "recovery_rate": 65.0,
  "top_tpas": [
    {"name": "Tawuniya", "count": 50, "amount": 60000.0},
    {"name": "Bupa", "count": 30, "amount": 35000.0}
  ]
}
```

### GET `/api/analytics/trends`
Get rejection trends over time.

**Query Parameters:**
- `period`: `daily`, `weekly`, `monthly`, `yearly`
- `start_date`: ISO 8601 date string
- `end_date`: ISO 8601 date string

---

## 🏥 Branch Management Endpoints

### GET `/api/branches`
List all branches.

### POST `/api/branches`
Create a new branch.

### GET `/api/branches/{id}`
Get branch details.

### PUT `/api/branches/{id}`
Update branch information.

---

## 🔍 FHIR Validation Endpoints

### POST `/api/fhir/validate`
Validate a FHIR resource against R4 profile.

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
    "patient": {"reference": "Patient/patient-001"},
    "created": "2024-01-15T10:30:00Z"
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

---

## ⚠️ Error Handling

All API errors follow a standardized format:

### Success Response (200-299)
```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error Response (400-599)
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "type": "value_error.email"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `CONFLICT` | 409 | Resource already exists |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |

---

## 🚦 Rate Limiting

### Default Limits
- **Unauthenticated:** 20 requests/minute per IP
- **Authenticated:** 100 requests/minute per IP
- **Admin:** 200 requests/minute per IP

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

### Rate Limit Exceeded Response
```json
{
  "error_code": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds.",
  "details": {
    "retry_after": 45
  }
}
```

---

## 🔒 Security Headers

All API responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 📝 Request/Response Examples

### cURL Examples

**Login:**
```bash
curl -X POST https://brainsait-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Create Rejection (Authenticated):**
```bash
curl -X POST https://brainsait-api.onrender.com/api/rejections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "tpa_name": "Tawuniya",
    "insurance_company": "Saudi Arabian Insurance",
    "branch": "Riyadh Main",
    "billed_amount": {"net": 5000.0, "vat": 750.0, "total": 5750.0},
    "rejected_amount": {"net": 1000.0, "vat": 150.0, "total": 1150.0},
    "rejection_received_date": "2024-12-01T10:30:00Z",
    "reception_mode": "NPHIES"
  }'
```

**Get Analytics:**
```bash
curl -X GET https://brainsait-api.onrender.com/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### JavaScript (Fetch) Examples

```javascript
// Login
const loginResponse = await fetch('https://brainsait-api.onrender.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { access_token } = await loginResponse.json();

// Create Rejection
const rejectionResponse = await fetch('https://brainsait-api.onrender.com/api/rejections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    tpa_name: 'Tawuniya',
    insurance_company: 'Saudi Arabian Insurance',
    branch: 'Riyadh Main',
    billed_amount: { net: 5000.0, vat: 750.0, total: 5750.0 },
    rejected_amount: { net: 1000.0, vat: 150.0, total: 1150.0 },
    rejection_received_date: '2024-12-01T10:30:00Z',
    reception_mode: 'NPHIES'
  })
});
const rejection = await rejectionResponse.json();
```

### Python (httpx) Examples

```python
import httpx
from datetime import datetime

async def create_rejection():
    # Login
    login_response = await httpx.post(
        'https://brainsait-api.onrender.com/auth/login',
        json={
            'email': 'user@example.com',
            'password': 'password123'
        }
    )
    token = login_response.json()['access_token']
    
    # Create rejection
    rejection_response = await httpx.post(
        'https://brainsait-api.onrender.com/api/rejections',
        json={
            'tpa_name': 'Tawuniya',
            'insurance_company': 'Saudi Arabian Insurance',
            'branch': 'Riyadh Main',
            'billed_amount': {'net': 5000.0, 'vat': 750.0, 'total': 5750.0},
            'rejected_amount': {'net': 1000.0, 'vat': 150.0, 'total': 1150.0},
            'rejection_received_date': '2024-12-01T10:30:00Z',
            'reception_mode': 'NPHIES'
        },
        headers={'Authorization': f'Bearer {token}'}
    )
    return rejection_response.json()
```

---

## 🔧 SDK Integration

### TypeScript/JavaScript SDK
```typescript
import { BrainSAITClient } from '@brainsait/sdk';

const client = new BrainSAITClient({
  baseUrl: 'https://brainsait-api.onrender.com',
  apiKey: 'your-api-key'
});

// Create rejection
const rejection = await client.rejections.create({
  tpaName: 'Tawuniya',
  insuranceCompany: 'Saudi Arabian Insurance',
  branch: 'Riyadh Main',
  billedAmount: { net: 5000, vat: 750, total: 5750 },
  rejectedAmount: { net: 1000, vat: 150, total: 1150 },
  rejectionReceivedDate: new Date('2024-12-01'),
  receptionMode: 'NPHIES'
});
```

---

## 📱 Webhook Integration

### Configuring Webhooks
Set up webhooks to receive real-time notifications:

```bash
POST /api/webhooks/configure
{
  "url": "https://your-server.com/webhook",
  "events": ["rejection.created", "rejection.updated", "letter.sent"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload
```json
{
  "event": "rejection.created",
  "timestamp": "2024-12-01T10:30:00Z",
  "data": {
    "id": "rej_123",
    "tpa_name": "Tawuniya",
    ...
  },
  "signature": "sha256=abc123..."
}
```

---

## 📖 Additional Resources

- **Interactive API Docs:** `https://brainsait-api.onrender.com/docs`
- **OpenAPI Spec:** `https://brainsait-api.onrender.com/openapi.json`
- **Security Guide:** `SECURITY_BEST_PRACTICES.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`

---

## 🆘 Support

- **Email:** support@brainsait.com
- **Documentation:** https://docs.brainsait.com
- **Status Page:** https://status.brainsait.com
- **GitHub Issues:** https://github.com/Fadil369/brainsait-rcm/issues

---

**Note:** This is a living document. Always refer to the interactive API documentation at `/docs` for the most up-to-date endpoint information.
