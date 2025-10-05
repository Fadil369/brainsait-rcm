# OASIS Integration Guide

Complete guide for integrating OASIS+ claim rejection data into BrainSAIT RCM platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Data Flow](#data-flow)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring](#monitoring)

## Overview

The OASIS Integration Service automates the collection of claim rejection data from the OASIS+ system and transforms it into the RCM platform's RejectionRecord format.

### Key Capabilities

- ✅ **Automated Authentication**: Handles OASIS+ login with SSL certificate bypass
- ✅ **Scheduled Sync**: Configurable periodic synchronization (default: hourly)
- ✅ **Data Extraction**: Extracts claims and rejections from OASIS+ tables
- ✅ **Bilingual Support**: Maps OASIS data to Arabic/English format
- ✅ **Data Transformation**: Converts OASIS format to RCM RejectionRecord
- ✅ **HIPAA Compliance**: Full audit logging of all data access
- ✅ **REST API**: Control and monitor via HTTP endpoints
- ✅ **Error Recovery**: Handles network issues and data errors gracefully

## Prerequisites

- Node.js 18+
- Chromium browser (auto-installed via Playwright)
- Access to OASIS+ system (credentials required)
- RCM API running and accessible

## Installation

### Option 1: Docker (Recommended)

```bash
# Clone repository
cd services/oasis-integration

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option 2: Local Development

```bash
cd services/oasis-integration

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

## Configuration

### Environment Variables

Create `.env` file with the following variables:

```bash
# OASIS+ Credentials
OASIS_URL=http://128.1.1.185/prod/faces/Home
OASIS_USERNAME=your_username
OASIS_PASSWORD=your_password

# Sync Settings
SYNC_ENABLED=true           # Auto-start sync on server start
SYNC_INTERVAL=60            # Sync every 60 minutes
LOOKBACK_DAYS=30            # Look back 30 days for rejections

# What to sync
SYNC_PENDING=false          # Sync pending claims (usually not needed)
SYNC_APPROVED=false         # Sync approved claims (usually not needed)

# RCM Integration
RCM_API_URL=http://localhost:3000/api
RCM_API_KEY=your_api_key

# Notifications
NOTIFY_ON_REJECTIONS=true
NOTIFICATION_EMAIL=admin@brainsait.com

# Server
PORT=3002
LOG_LEVEL=info
```

## Usage

### 1. Discovery Mode (First Time Setup)

Before using the integration, run the discovery script to understand OASIS+ structure:

```bash
# Headless mode (faster)
npm run discover

# Headed mode (see browser actions)
npm run discover:headed
```

This generates:
- `discovery-output/oasis-discovery.json` - Structured data
- `discovery-output/OASIS_INTEGRATION_GUIDE.md` - Documentation
- `screenshots/*.png` - Visual documentation

**Important**: Review the generated files and update the extractor code if OASIS+ structure has changed.

### 2. Start Integration Service

```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose up -d
```

### 3. Monitor Status

```bash
# Check health
curl http://localhost:3002/health

# Get integration status
curl http://localhost:3002/api/status
```

### 4. Trigger Manual Sync

```bash
curl -X POST http://localhost:3002/api/sync/trigger
```

## API Reference

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "oasis-integration",
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

### Get Status

```http
GET /api/status
```

**Response:**
```json
{
  "connected": true,
  "lastSyncTime": "2025-10-05T11:00:00.000Z",
  "lastSyncStatus": "SUCCESS",
  "statistics": {
    "totalClaimsProcessed": 1250,
    "totalRejectionsFound": 387,
    "lastBatchSize": 15
  },
  "nextScheduledSync": "2025-10-05T12:00:00.000Z"
}
```

### Start Sync Service

```http
POST /api/sync/start
```

**Response:**
```json
{
  "message": "Sync service started successfully",
  "config": {
    "enabled": true,
    "syncInterval": 60,
    "lookbackDays": 30
  }
}
```

### Stop Sync Service

```http
POST /api/sync/stop
```

### Trigger Manual Sync

```http
POST /api/sync/trigger
```

**Response:**
```json
{
  "syncId": "SYNC-1759663417030",
  "startTime": "2025-10-05T12:00:00.000Z",
  "endTime": "2025-10-05T12:05:30.000Z",
  "duration": 330000,
  "source": {
    "system": "OASIS",
    "dateRange": {
      "from": "2025-09-05",
      "to": "2025-10-05"
    }
  },
  "results": {
    "totalFetched": 45,
    "totalProcessed": 43,
    "totalImported": 42,
    "totalSkipped": 1,
    "totalErrors": 2
  },
  "imported": {
    "newRejections": 42,
    "updatedRejections": 0,
    "rejectionIds": ["RCM-CLM-001-...", "RCM-CLM-002-..."]
  },
  "status": "PARTIAL"
}
```

### Update Configuration

```http
PUT /api/config
Content-Type: application/json

{
  "syncInterval": 30,
  "lookbackDays": 60
}
```

### Get Configuration

```http
GET /api/config
```

## Data Flow

### Step-by-Step Process

1. **Authentication**
   ```
   OASISClient
   ├─ Navigate to login page
   ├─ Handle SSL warnings
   ├─ Fill username/password
   ├─ Submit login form
   └─ Capture session cookies
   ```

2. **Search & Extract**
   ```
   ClaimExtractor
   ├─ Navigate to claim search
   ├─ Fill search form (date range, status filters)
   ├─ Submit search
   ├─ Extract claims from results table
   └─ For each rejection:
       ├─ Click claim number
       ├─ Extract detailed rejection info
       └─ Return to search results
   ```

3. **Transform**
   ```
   OASISToRCMTransformer
   ├─ Map OASIS fields → RCM fields
   ├─ Calculate timeline metrics
   ├─ Convert to bilingual format
   ├─ Assess risk level
   └─ Generate RCM RejectionRecord
   ```

4. **Import to RCM**
   ```
   SyncService
   ├─ POST to RCM API /rejections/import
   ├─ Log audit entry
   ├─ Update statistics
   └─ Schedule next sync
   ```

### Data Mapping Example

**OASIS Format:**
```json
{
  "claimNumber": "CLM-2025-001",
  "rejectionCode": "M01",
  "rejectionReason": "Service not covered",
  "totalAmount": 5000,
  "rejectionDate": "2025-10-01"
}
```

**RCM Format:**
```json
{
  "id": "RCM-CLM-2025-001-1759663417030",
  "claimNumber": "CLM-2025-001",
  "rejectionDetails": {
    "rejectionCode": "M01",
    "rejectionReason": {
      "ar": "خدمة غير مغطاة",
      "en": "Service not covered"
    },
    "category": "MEDICAL",
    "rejectionType": "FULL"
  },
  "financialImpact": {
    "totalRejected": {
      "net": 4347.83,
      "vat": 652.17,
      "total": 5000
    }
  },
  "timeline": {
    "daysUntilDeadline": 28,
    "appealDeadline": "2025-10-31"
  },
  "status": "PENDING_REVIEW"
}
```

## Troubleshooting

### Issue: "Could not locate username or password fields"

**Cause**: OASIS+ login page structure changed

**Solution**:
1. Run discovery script: `npm run discover:headed`
2. Review screenshots in `screenshots/`
3. Update field selectors in `src/client/OASISClient.ts`

### Issue: "Internal Server Error 500" from OASIS

**Cause**: OASIS+ system unavailable or network issue

**Solution**:
1. Check OASIS_URL is correct
2. Verify network connectivity: `ping 128.1.1.185`
3. Check if OASIS+ is running
4. Verify credentials are valid

### Issue: No data extracted

**Cause**: Date range has no rejections, or table structure changed

**Solution**:
1. Verify rejections exist in OASIS+ for the date range
2. Check `LOOKBACK_DAYS` configuration
3. Run discovery to verify table structure
4. Update selectors in `src/extractors/ClaimExtractor.ts`

### Issue: RCM import fails

**Cause**: RCM API not accessible or authentication failed

**Solution**:
1. Check RCM API is running: `curl http://localhost:3000/health`
2. Verify `RCM_API_URL` and `RCM_API_KEY`
3. Check RCM API logs for errors
4. Test manually: `curl -H "Authorization: Bearer $RCM_API_KEY" $RCM_API_URL/rejections`

## Monitoring

### Logs

**Application Logs** (stdout):
```bash
# Docker
docker-compose logs -f oasis-integration

# Local
npm run dev
```

**Audit Logs** (HIPAA compliance):
```bash
tail -f logs/audit/audit-2025-10-05.log
```

### Metrics to Monitor

1. **Sync Success Rate**
   ```bash
   curl http://localhost:3002/api/status | jq '.lastSyncStatus'
   ```

2. **Total Rejections Found**
   ```bash
   curl http://localhost:3002/api/status | jq '.statistics.totalRejectionsFound'
   ```

3. **Last Sync Time**
   ```bash
   curl http://localhost:3002/api/status | jq '.lastSyncTime'
   ```

### Alerts

Set up alerts for:
- ❌ `lastSyncStatus = "FAILED"`
- ⚠️ `nextScheduledSync` in the past
- ⚠️ `connected = false`

## Best Practices

1. **Run Discovery Regularly**: Run discovery script monthly to detect OASIS+ changes
2. **Monitor Audit Logs**: Review audit logs for suspicious access patterns
3. **Secure Credentials**: Never commit `.env` to version control
4. **Test Before Production**: Use `discover:headed` mode to verify changes
5. **Set Reasonable Intervals**: Don't set `SYNC_INTERVAL` too low (< 15 minutes)
6. **Review Skipped Records**: Check `skipped` array in sync results

## Security Considerations

- **SSL Bypass**: Only use SSL bypass for internal OASIS systems with self-signed certificates
- **Credentials**: Store credentials in environment variables or secrets manager
- **Audit Logs**: Keep audit logs for at least 6 years (HIPAA requirement)
- **API Authentication**: Always use `RCM_API_KEY` for production

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review screenshots: `screenshots/error-*.png`
- Contact BrainSAIT development team

## License

Proprietary - BrainSAIT Healthcare Platform
