# Audit Service

**Owner:** Platform Team  
**Status:** 🟢 Active Development  
**Language:** Python 3.12 + FastAPI  
**Port:** 8002

## Overview

The Audit Service provides append-only event logging for all RCM operations with immutable storage. It implements comprehensive audit trails for compliance with HIPAA, NPHIES regulations, and internal governance requirements.

## Features

- **Append-Only Event Log:** Immutable audit trail with cryptographic integrity
- **Kafka Producer:** Streams events to Kafka for real-time processing
- **MongoDB Sink:** Long-term storage with TTL and archival policies
- **Query API:** Search and retrieve audit logs by entity, actor, timeframe
- **FHIR AuditEvent:** Compliance with FHIR R4 AuditEvent resource structure
- **Retention Policies:** Configurable TTL with cold storage archival

## Event Types

- **CLAIM_CREATED:** New claim submission
- **CLAIM_VALIDATED:** Claim validation completed
- **CLAIM_SUBMITTED:** Claim sent to payer
- **CLAIM_APPROVED:** Claim approved by payer
- **CLAIM_DENIED:** Claim denied by payer
- **USER_LOGIN:** User authentication event
- **USER_LOGOUT:** User session terminated
- **PERMISSION_CHANGED:** Role/permission modification
- **DATA_ACCESSED:** Sensitive data access
- **DATA_MODIFIED:** Data update or deletion
- **SYSTEM_ERROR:** System-level error event

## API Endpoints

### POST /api/v1/audit/log
Log a new audit event.

**Request:**
```json
{
  "eventType": "CLAIM_VALIDATED",
  "actor": {
    "userId": "user-123",
    "username": "john.doe@hnh.sa",
    "role": "CLAIMS_SPECIALIST",
    "ipAddress": "10.0.1.45"
  },
  "resource": {
    "resourceType": "Claim",
    "resourceId": "CLM-2024-001",
    "branchId": "HNH_UNAIZAH"
  },
  "action": "READ",
  "outcome": "SUCCESS",
  "metadata": {
    "denialRiskScore": 35.2,
    "validationId": "val_1234567890"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "auditId": "audit_abcdef123456",
  "eventId": "evt_9876543210",
  "logged": true,
  "timestamp": "2024-01-15T10:30:00.123Z",
  "integrity": {
    "hash": "sha256:a1b2c3d4...",
    "previousHash": "sha256:x9y8z7w6..."
  }
}
```

### GET /api/v1/audit/query
Query audit logs with filters.

**Query Parameters:**
- `actor_id`: Filter by user ID
- `resource_type`: Filter by resource type (Claim, User, etc.)
- `resource_id`: Filter by specific resource ID
- `event_type`: Filter by event type
- `start_date`: ISO8601 start timestamp
- `end_date`: ISO8601 end timestamp
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 500)

**Response:**
```json
{
  "events": [
    {
      "auditId": "audit_abcdef123456",
      "eventType": "CLAIM_VALIDATED",
      "actor": { "userId": "user-123", "username": "john.doe@hnh.sa" },
      "resource": { "resourceType": "Claim", "resourceId": "CLM-2024-001" },
      "action": "READ",
      "outcome": "SUCCESS",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1543,
    "totalPages": 31
  }
}
```

### GET /api/v1/audit/timeline/{resourceType}/{resourceId}
Get full audit timeline for a specific resource.

**Response:**
```json
{
  "resourceType": "Claim",
  "resourceId": "CLM-2024-001",
  "timeline": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "eventType": "CLAIM_CREATED",
      "actor": "john.doe@hnh.sa",
      "action": "CREATE",
      "outcome": "SUCCESS"
    },
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "eventType": "CLAIM_VALIDATED",
      "actor": "system",
      "action": "READ",
      "outcome": "SUCCESS",
      "metadata": { "denialRiskScore": 35.2 }
    }
  ]
}
```

### GET /health
Service health check.

## Architecture

```
┌──────────────┐
│ Any Service  │
└──────┬───────┘
       │ POST /audit/log
       │
┌──────▼─────────────┐        ┌────────────────┐
│  Audit Service     │───────►│ Kafka Producer │
│  (FastAPI)         │        │  (topic: audit)│
└──────┬─────────────┘        └────────────────┘
       │
       │ Hash Chain
       │
┌──────▼─────────────┐        ┌────────────────┐
│  MongoDB           │───────►│ Cold Storage   │
│  (append-only)     │        │  (Archive)     │
└────────────────────┘        └────────────────┘
```

## Integrity Model

The Audit Service uses a hash chain to ensure immutability:

1. Each event is hashed: `SHA256(event_data + previous_hash)`
2. The hash is stored with the event
3. Any tampering breaks the chain
4. Integrity verification can detect modifications

## Dependencies

- **FastAPI:** Web framework
- **kafka-python:** Kafka producer for event streaming
- **motor:** Async MongoDB driver
- **cryptography:** Hash chain integrity

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `KAFKA_BROKERS` | Kafka broker addresses | `kafka:9092` |
| `KAFKA_TOPIC` | Kafka topic for audit events | `audit-events` |
| `RETENTION_DAYS` | Audit log retention period | `2555` (7 years) |
| `ENABLE_COLD_STORAGE` | Archive old logs to S3/Azure Blob | `true` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Deployment

**Resources:**
- CPU: 0.5 core
- Memory: 1GB
- Replicas: 3 (HA)

**Health Check:**
- Path: `/health`
- Interval: 30s
- Timeout: 5s

**Secrets:**
- `mongodb-audit-credentials`: Audit database credentials
- `kafka-credentials`: Kafka SASL credentials (if required)

## Compliance

- **HIPAA:** Audit logs for PHI access with 7-year retention
- **NPHIES:** Audit trail for all claim submissions and modifications
- **GDPR:** User consent tracking and data access logs
- **SOC 2:** Comprehensive activity logging for security controls

## Testing

```bash
# Run unit tests
pytest tests/

# Log a test event
curl -X POST http://localhost:8002/api/v1/audit/log \
  -H "Content-Type: application/json" \
  -d @test-audit-event.json

# Query audit logs
curl "http://localhost:8002/api/v1/audit/query?resource_type=Claim&limit=10"

# Get resource timeline
curl "http://localhost:8002/api/v1/audit/timeline/Claim/CLM-2024-001"
```

## Related Services

- **Claims Scrubbing Service:** Logs validation events
- **FHIR Gateway:** Logs FHIR validation events
- **Auth Backend:** Logs authentication events
- **All services:** Should log critical operations to Audit Service
