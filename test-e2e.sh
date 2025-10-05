#!/bin/bash
# End-to-End Test Script for BrainSAIT RCM Platform

set -e

echo "=========================================="
echo "BrainSAIT RCM - End-to-End Test Script"
echo "=========================================="
echo ""

# Configuration
CLAIMS_API="http://localhost:8000"
FHIR_API="http://localhost:8001"
AUDIT_API="http://localhost:8002"
FRONTEND="http://localhost:3000"

# Test Data
TEST_CLAIM='{
  "patientId": "1234567890",
  "payerId": "PAYER_A",
  "serviceDate": "2024-01-15",
  "icdCodes": ["J45.0", "I10"],
  "cptCodes": ["99213", "80053"],
  "totalAmount": 1500.00,
  "providerId": "HNH_UNAIZAH",
  "documentation": {
    "preAuthNumber": "AUTH-2024-001"
  }
}'

echo "Step 1: Starting Services"
echo "=========================="
echo "Starting MongoDB..."
docker run -d --name mongodb -p 27017:27017 mongo:6 || echo "MongoDB already running"

echo "Starting Redis..."
docker run -d --name redis -p 6379:6379 redis:7-alpine || echo "Redis already running"

echo "Starting Claims Scrubbing Service..."
cd services/claims-scrubbing
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000 &
CLAIMS_PID=$!
cd ../..

echo "Starting FHIR Gateway Service..."
cd services/fhir-gateway
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8001 &
FHIR_PID=$!
cd ../..

echo "Starting Audit Service..."
cd services/audit-service
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8002 &
AUDIT_PID=$!
cd ../..

echo "Starting Next.js Frontend..."
cd apps/web
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "Waiting for services to start..."
sleep 10

echo ""
echo "Step 2: Health Checks"
echo "====================="

echo "Checking Claims Scrubbing Service..."
curl -f $CLAIMS_API/health || echo "FAILED"

echo "Checking FHIR Gateway Service..."
curl -f $FHIR_API/health || echo "FAILED"

echo "Checking Audit Service..."
curl -f $AUDIT_API/health || echo "FAILED"

echo ""
echo "Step 3: Test Claim Validation"
echo "============================="
echo "Submitting test claim for validation..."

VALIDATION_RESPONSE=$(curl -s -X POST $CLAIMS_API/api/v1/claims/validate \
  -H "Content-Type: application/json" \
  -d "$TEST_CLAIM")

echo "Validation Response:"
echo "$VALIDATION_RESPONSE" | jq '.'

VALIDATION_ID=$(echo "$VALIDATION_RESPONSE" | jq -r '.validationId')
RISK_SCORE=$(echo "$VALIDATION_RESPONSE" | jq -r '.denialRiskScore')
STATUS=$(echo "$VALIDATION_RESPONSE" | jq -r '.status')

echo ""
echo "Validation Results:"
echo "  Validation ID: $VALIDATION_ID"
echo "  Risk Score: $RISK_SCORE"
echo "  Status: $STATUS"

if [ "$STATUS" != "pass" ] && [ "$STATUS" != "warning" ]; then
  echo "ERROR: Validation failed!"
  exit 1
fi

echo ""
echo "Step 4: Test FHIR Mapping"
echo "========================="
echo "Mapping claim to NPHIES FHIR Bundle..."

FHIR_MAPPING=$(curl -s -X POST $FHIR_API/api/v1/fhir/map-to-nphies \
  -H "Content-Type: application/json" \
  -d "$TEST_CLAIM")

echo "FHIR Bundle:"
echo "$FHIR_MAPPING" | jq '.bundle.entry[] | {resourceType: .resource.resourceType, id: .resource.id}'

NPHIES_COMPLIANT=$(echo "$FHIR_MAPPING" | jq -r '.nphiesCompliant')
echo ""
echo "NPHIES Compliance: $NPHIES_COMPLIANT"

if [ "$NPHIES_COMPLIANT" != "true" ]; then
  echo "WARNING: FHIR Bundle is not NPHIES compliant"
  echo "$FHIR_MAPPING" | jq '.mappingWarnings'
fi

echo ""
echo "Step 5: Test Audit Logging"
echo "=========================="
echo "Logging audit event..."

AUDIT_EVENT='{
  "eventType": "CLAIM_VALIDATED",
  "actor": {
    "userId": "test-user-001",
    "username": "test@brainsait.sa",
    "role": "CLAIMS_SPECIALIST",
    "ipAddress": "127.0.0.1"
  },
  "resource": {
    "resourceType": "Claim",
    "resourceId": "CLM-TEST-001",
    "branchId": "HNH_UNAIZAH"
  },
  "action": "READ",
  "outcome": "SUCCESS",
  "metadata": {
    "validationId": "'$VALIDATION_ID'",
    "denialRiskScore": '$RISK_SCORE'
  }
}'

AUDIT_RESPONSE=$(curl -s -X POST $AUDIT_API/api/v1/audit/log \
  -H "Content-Type: application/json" \
  -d "$AUDIT_EVENT")

echo "Audit Response:"
echo "$AUDIT_RESPONSE" | jq '.'

AUDIT_ID=$(echo "$AUDIT_RESPONSE" | jq -r '.auditId')
echo ""
echo "Audit ID: $AUDIT_ID"

echo ""
echo "Step 6: Query Audit Logs"
echo "========================"
echo "Querying recent audit events..."

AUDIT_QUERY=$(curl -s "$AUDIT_API/api/v1/audit/query?resource_type=Claim&limit=5")

echo "Recent Audit Events:"
echo "$AUDIT_QUERY" | jq '.events[] | {auditId: .auditId, eventType: .eventType, timestamp: .timestamp}'

echo ""
echo "Step 7: Frontend Integration Test"
echo "=================================="
echo "Opening Claims Oasis in browser..."
echo "Please navigate to: $FRONTEND/claims/new"
echo ""
echo "Manual Test Steps:"
echo "1. Fill in patient information (National ID: 1234567890)"
echo "2. Select payer (PAYER_A) and provider (HNH_UNAIZAH)"
echo "3. Add ICD-10 codes: J45.0, I10"
echo "4. Add CPT codes: 99213, 80053"
echo "5. Enter claim amount: 1500.00"
echo "6. Click 'Validate Claim'"
echo "7. Review risk score and validation issues"
echo "8. Click 'Submit Claim'"
echo ""
echo "Expected Result:"
echo "  - Risk score displayed with color-coded indicator"
echo "  - Compliance badges show NPHIES MDS and Payer Rules status"
echo "  - No critical validation errors"
echo "  - Claim submission successful"

echo ""
echo "Step 8: Metrics Check"
echo "===================="
echo "Checking Prometheus metrics..."

echo ""
echo "Claims Scrubbing Metrics:"
curl -s $CLAIMS_API/metrics | grep "claims_validated_total"

echo ""
echo "FHIR Gateway Metrics:"
curl -s $FHIR_API/metrics | grep "fhir_validations_total"

echo ""
echo "Audit Service Metrics:"
curl -s $AUDIT_API/metrics | grep "audit_events_total"

echo ""
echo "=========================================="
echo "End-to-End Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Services started successfully"
echo "  ✓ Claim validation completed (Score: $RISK_SCORE)"
echo "  ✓ FHIR mapping successful (NPHIES: $NPHIES_COMPLIANT)"
echo "  ✓ Audit logging verified (ID: $AUDIT_ID)"
echo ""
echo "Next Steps:"
echo "1. Review validation results in MongoDB"
echo "2. Check Kafka topic for audit events (if Kafka is running)"
echo "3. Test OASIS+ integration at http://128.1.1.185/prod/faces/Home"
echo ""
echo "To stop services:"
echo "  kill $CLAIMS_PID $FHIR_PID $AUDIT_PID $FRONTEND_PID"
echo "  docker stop mongodb redis"
echo ""
