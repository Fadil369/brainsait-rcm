# OASIS+ Integration Plan

## System Details

**OASIS+ Access:**
- URL: `http://128.1.1.185/prod/faces/Home`
- Username: `U29958`
- Password: `U29958`
- Protocol: HTTP (internal network)
- Platform: Oracle Faces (JSF-based web application)

## Integration Strategy

### Phase 1: System Discovery (Current)
**Objectives:**
- [ ] Log into OASIS+ system
- [ ] Identify claim submission workflow
- [ ] Document form fields and validation rules
- [ ] Capture API endpoints (if any)
- [ ] Examine data format requirements
- [ ] Test authentication mechanism

**Tools:**
- Browser DevTools (Network tab, Console)
- Postman/Insomnia for API testing
- Selenium/Playwright for automation

### Phase 2: Data Mapping
**Map OASIS+ fields to our models:**

| OASIS+ Field | Our Model Field | Data Type | Validation |
|--------------|-----------------|-----------|------------|
| Patient ID | `patientId` | string(10) | National ID format |
| Service Date | `serviceDate` | date | YYYY-MM-DD |
| Payer | `payerId` | string | PAYER_A, PAYER_B, etc. |
| Provider | `providerId` | string | HNH_UNAIZAH, etc. |
| ICD-10 Codes | `icdCodes[]` | array | ^[A-Z]\d{2}(\.\d{1,2})?$ |
| CPT Codes | `cptCodes[]` | array | ^\d{5}$ |
| Claim Amount | `totalAmount` | float | > 0, SAR currency |
| Pre-Auth | `documentation.preAuthNumber` | string | Optional |

### Phase 3: Integration Implementation

#### Option A: HTTP API Integration (Preferred)
If OASIS+ exposes REST/SOAP API:

```python
# services/oasis-integration/client.py
import httpx
from typing import Dict, Any

class OASISClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url
        self.username = username
        self.password = password
        self.session: httpx.AsyncClient = None
        self.auth_token: str = None
    
    async def authenticate(self):
        """Authenticate with OASIS+ system"""
        response = await self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"username": self.username, "password": self.password}
        )
        self.auth_token = response.json()["token"]
    
    async def submit_claim(self, fhir_bundle: Dict[str, Any]) -> Dict[str, Any]:
        """Submit FHIR bundle to OASIS+"""
        # Convert FHIR bundle to OASIS+ format
        oasis_claim = self._convert_fhir_to_oasis(fhir_bundle)
        
        response = await self.session.post(
            f"{self.base_url}/api/claims/submit",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=oasis_claim
        )
        return response.json()
    
    def _convert_fhir_to_oasis(self, fhir_bundle: Dict[str, Any]) -> Dict[str, Any]:
        """Map FHIR Bundle to OASIS+ claim structure"""
        # Extract resources from bundle
        claim = self._find_resource(fhir_bundle, "Claim")
        patient = self._find_resource(fhir_bundle, "Patient")
        
        return {
            "patientId": patient["identifier"][0]["value"],
            "payerId": claim["insurance"][0]["coverage"]["reference"].split("/")[1],
            # ... more mappings
        }
```

#### Option B: UI Automation (Fallback)
If no API available, automate web UI:

```python
# services/oasis-integration/automation.py
from playwright.async_api import async_playwright
from typing import Dict, Any

class OASISAutomation:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url
        self.username = username
        self.password = password
    
    async def submit_claim(self, claim_data: Dict[str, Any]) -> str:
        """Submit claim via UI automation"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Login
            await page.goto(self.base_url)
            await page.fill('input[name="username"]', self.username)
            await page.fill('input[name="password"]', self.password)
            await page.click('button[type="submit"]')
            
            # Navigate to claim submission
            await page.click('a:has-text("New Claim")')
            
            # Fill form
            await page.fill('#patientId', claim_data['patientId'])
            await page.fill('#serviceDate', claim_data['serviceDate'])
            await page.select_option('#payerId', claim_data['payerId'])
            
            # Add ICD codes
            for code in claim_data['icdCodes']:
                await page.fill('#icdCode', code)
                await page.click('#addIcdCode')
            
            # Submit
            await page.click('button:has-text("Submit Claim")')
            
            # Extract confirmation number
            confirmation = await page.text_content('.confirmation-number')
            
            await browser.close()
            return confirmation
```

### Phase 4: Service Integration

Create new OASIS+ Integration Service:

```yaml
# services/oasis-integration/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oasis-integration-service
  namespace: production
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: oasis-integration
        image: brainsait/oasis-integration:latest
        env:
        - name: OASIS_BASE_URL
          value: "http://128.1.1.185/prod"
        - name: OASIS_USERNAME
          valueFrom:
            secretKeyRef:
              name: oasis-credentials
              key: username
        - name: OASIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: oasis-credentials
              key: password
```

### Phase 5: Workflow Update

Enhanced claim submission flow:

```
1. User submits claim in Claims Oasis frontend
   ↓
2. POST /api/v1/claims/validate (Claims Scrubbing Service)
   → Validates NPHIES compliance
   → Returns risk score
   ↓
3. User clicks "Submit Claim"
   ↓
4. POST /api/v1/fhir/map-to-nphies (FHIR Gateway Service)
   → Maps to FHIR Bundle
   → Validates conformance
   ↓
5. POST /api/v1/oasis/submit (OASIS Integration Service) [NEW]
   → Authenticates with OASIS+
   → Submits claim
   → Receives confirmation number
   ↓
6. POST /api/v1/audit/log (Audit Service)
   → Logs CLAIM_SUBMITTED event
   → Stores confirmation number
   ↓
7. Return confirmation to user
```

## Testing Plan

### Manual Testing Checklist

1. **Authentication Test:**
   ```bash
   # Test login credentials
   curl -X POST http://128.1.1.185/prod/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "U29958", "password": "U29958"}'
   ```

2. **Form Field Discovery:**
   - Open OASIS+ in browser
   - Navigate to claim submission page
   - Inspect HTML form elements
   - Document input names, types, validations

3. **Network Traffic Analysis:**
   - Open DevTools → Network tab
   - Submit a test claim
   - Capture request/response
   - Document API endpoints and payloads

4. **Integration Test:**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Submit test claim via our API
   curl -X POST http://localhost:8000/api/v1/claims/validate \
     -H "Content-Type: application/json" \
     -d @test-claim.json
   
   # Submit to OASIS+ (once integration built)
   curl -X POST http://localhost:8003/api/v1/oasis/submit \
     -H "Content-Type: application/json" \
     -d @fhir-bundle.json
   ```

### Automated Testing

```python
# tests/integration/test_oasis_integration.py
import pytest
from services.oasis_integration.client import OASISClient

@pytest.mark.asyncio
async def test_oasis_authentication():
    client = OASISClient(
        base_url="http://128.1.1.185/prod",
        username="U29958",
        password="U29958"
    )
    await client.authenticate()
    assert client.auth_token is not None

@pytest.mark.asyncio
async def test_claim_submission():
    client = OASISClient(...)
    await client.authenticate()
    
    fhir_bundle = load_test_bundle()
    result = await client.submit_claim(fhir_bundle)
    
    assert result["status"] == "submitted"
    assert result["confirmationNumber"] is not None
```

## Security Considerations

1. **Network Isolation:**
   - OASIS+ is on internal network (128.1.1.185)
   - Must be accessed from within HNH network or VPN
   - Consider firewall rules for K8s cluster

2. **Credentials Management:**
   ```yaml
   # Create Kubernetes secret
   kubectl create secret generic oasis-credentials \
     --from-literal=username=U29958 \
     --from-literal=password=U29958 \
     --namespace=production
   ```

3. **Audit Trail:**
   - Log all OASIS+ submissions to Audit Service
   - Include confirmation numbers
   - Track submission timestamps

4. **Error Handling:**
   - Retry logic for network failures
   - Fallback to manual submission if OASIS+ down
   - Alert on authentication failures

## Data Flow Diagram

```
┌──────────────┐
│ Claims Oasis │ User fills form
│   Frontend   │
└──────┬───────┘
       │
       │ 1. Validate
       ▼
┌─────────────────┐
│ Claims Scrubbing│ NPHIES validation
│    Service      │ Risk scoring
└──────┬──────────┘
       │
       │ 2. Map to FHIR
       ▼
┌─────────────────┐
│  FHIR Gateway   │ FHIR R4 conformance
│    Service      │ NPHIES MDS mapping
└──────┬──────────┘
       │
       │ 3. Submit to OASIS+
       ▼
┌─────────────────┐       ┌─────────────┐
│ OASIS Integration│──────▶│   OASIS+    │
│    Service      │◀──────│   System    │
└──────┬──────────┘       └─────────────┘
       │                  128.1.1.185
       │ 4. Log submission
       ▼
┌─────────────────┐
│  Audit Service  │ Immutable event log
│                 │ Kafka streaming
└─────────────────┘
```

## Next Steps

1. **Immediate Actions:**
   - [ ] Access OASIS+ at http://128.1.1.185/prod/faces/Home
   - [ ] Log in with U29958 / U29958
   - [ ] Document claim submission workflow
   - [ ] Capture form fields and validation rules
   - [ ] Check for API documentation

2. **Development:**
   - [ ] Create `services/oasis-integration` directory
   - [ ] Implement OASISClient or OASISAutomation class
   - [ ] Write unit tests for data mapping
   - [ ] Create integration tests

3. **Deployment:**
   - [ ] Build Docker image for oasis-integration service
   - [ ] Create Kubernetes deployment manifest
   - [ ] Configure secrets for OASIS+ credentials
   - [ ] Deploy to staging environment
   - [ ] Conduct end-to-end testing

4. **Monitoring:**
   - [ ] Add Prometheus metrics for OASIS+ submissions
   - [ ] Create Grafana dashboard for submission rates
   - [ ] Set up alerts for submission failures
   - [ ] Monitor OASIS+ system availability

---

**Ready for OASIS+ system access and integration planning.**
