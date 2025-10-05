# OASIS+ Automated Discovery - Ready to Run

## 📦 What Was Created

A comprehensive Playwright automation script that will:

1. **Log into OASIS+** using credentials `U29958 / U29958`
2. **Navigate** to claim submission page automatically
3. **Extract ALL form fields** with labels, types, validation rules, dropdown options
4. **Capture API endpoints** via network interception (request/response bodies)
5. **Generate documentation** in 3 formats: JSON, Markdown, TypeScript types
6. **Take screenshots** of every step for visual verification

## 🚀 How to Run

### Quick Start (3 Steps)

```bash
# 1. Navigate to service directory
cd C:\Users\rcmrejection3\nphies-rcm\brainsait-rcm\services\oasis-integration

# 2. Run discovery (choose one):
npm run discover          # Headless mode (fast, no browser window)
npm run discover:headed   # Headed mode (watch browser work)

# 3. Review output
cat discovery-output/OASIS_INTEGRATION_GUIDE.md
```

### Expected Runtime
- **Headless**: ~30-60 seconds
- **Headed**: ~1-2 minutes (slower for visibility)

## 📋 What You'll Get

After running, you'll have:

### 1. Screenshots (`screenshots/` directory)
- `01-login-page-*.png` - Login form
- `02-credentials-filled-*.png` - Before submission
- `03-logged-in-*.png` - Home page after login
- `04-claim-submission-page-*.png` - **The claim form we need!**
- `05-claim-search-page-*.png` - Search/list page (if found)
- `error-*.png` - If anything fails

### 2. Structured Data (`discovery-output/oasis-discovery.json`)
```json
{
  "timestamp": "2025-10-05T...",
  "oasisVersion": "2.5",
  "authentication": {
    "loginUrl": "http://128.1.1.185/prod/faces/Home",
    "sessionMechanism": "Cookie: JSESSIONID"
  },
  "pages": {
    "claimSubmission": {
      "forms": [
        {
          "name": "claimForm",
          "fields": [
            {
              "name": "patientId",
              "type": "text",
              "label": "Patient ID",
              "required": true,
              "validation": { "pattern": "^\\d{10}$" }
            },
            {
              "name": "serviceType",
              "type": "select",
              "label": "Service Type",
              "options": [
                { "value": "consultation", "text": "Consultation" },
                { "value": "surgery", "text": "Surgery" }
              ]
            }
          ]
        }
      ]
    }
  },
  "apiEndpoints": [
    {
      "url": "http://128.1.1.185/api/claims/submit",
      "method": "POST",
      "requestBody": "{ ... }",
      "responseBody": "{ ... }"
    }
  ]
}
```

### 3. Human-Readable Guide (`discovery-output/OASIS_INTEGRATION_GUIDE.md`)
Markdown document with:
- Authentication steps
- Form field reference table
- API endpoint documentation
- Navigation flow

### 4. TypeScript Types (`discovery-output/oasis-types.ts`)
```typescript
export enum ServiceTypeOptions {
  CONSULTATION = 'consultation',
  SURGERY = 'surgery',
  // ... all dropdown values
}

export interface OASISClaimSubmission {
  patientId: string;
  serviceDate: string;
  icdCodes: string[];
  cptCodes: string[];
  // ... all form fields with correct types
}
```

## 🔍 What the Script Does (Behind the Scenes)

### Step 1: Login Analysis
- Detects username/password fields by name patterns
- Identifies submit button
- Captures login form structure

### Step 2: Authentication
- Fills credentials: `U29958 / U29958`
- Submits form
- Waits for navigation
- Extracts session cookies

### Step 3: Home Page
- Analyzes page structure
- Detects OASIS+ version
- Maps navigation links

### Step 4: Claim Submission (🎯 Main Target)
- Searches for links with: "claim", "submit", "new claim", etc.
- Clicks into claim submission page
- Extracts **ALL form fields**:
  - Input fields (text, number, date)
  - Dropdowns (with all options)
  - Textareas
  - Checkboxes/radios
  - Labels and placeholders
  - Required/optional status
  - Validation rules (regex patterns, min/max)

### Step 5: API Interception
Throughout all steps, captures:
- Every HTTP request (URL, method, headers, body)
- Every HTTP response (status, headers, body, timing)
- Filters out static files (.css, .png, .js)
- Records timing data

### Step 6: Documentation Generation
- Compiles all data into JSON
- Generates markdown tables
- Creates TypeScript interfaces
- Auto-infers types from field definitions

## 🎯 Next Steps After Discovery

### Immediate (You)
1. Run the script: `npm run discover:headed`
2. Watch it work (takes ~1-2 minutes)
3. Review screenshots to verify it found the claim form
4. Share the output with me (or just key findings)

### Phase 2 (Me - After You Share Results)
1. **Build Integration Service** (`src/index.ts`)
   - OASIS+ API client
   - Session management
   - Claim submission logic
   - Error handling with retry

2. **Map FHIR → OASIS**
   ```typescript
   // Example mapping
   function mapFHIRToOASIS(fhirClaim: ClaimResponse): OASISClaimSubmission {
     return {
       patientId: fhirClaim.patient.identifier,
       serviceDate: fhirClaim.billablePeriod.start,
       icdCodes: fhirClaim.diagnosis.map(d => d.diagnosisCodeableConcept.code),
       // ... complete mapping
     };
   }
   ```

3. **Create Kubernetes Deployment**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: oasis-integration
   spec:
     replicas: 2
     template:
       spec:
         containers:
         - name: oasis-integration
           image: brainsait/oasis-integration:latest
           env:
           - name: OASIS_URL
             valueFrom:
               secretKeyRef:
                 name: oasis-credentials
                 key: url
   ```

4. **End-to-End Test**
   ```bash
   # Test full workflow
   curl -X POST http://localhost:3005/submit-claim \
     -H "Content-Type: application/json" \
     -d @test-claim.json

   # Should return:
   # { "success": true, "oasisClaimId": "CLM123456" }
   ```

## 🎓 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js / React Native)                          │
│  - User creates claim                                       │
│  - Submits for validation                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Claims Validation API (FastAPI)                            │
│  - AI scrubbing (denial risk scoring)                       │
│  - NPHIES MDS compliance check                              │
│  - Returns validation result                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  FHIR Gateway (apps/api)                                    │
│  - Converts claim to FHIR ClaimResponse                     │
│  - FHIR R4 validation                                       │
│  - Routes to appropriate submitter                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  OASIS+ Integration Service  ← YOU ARE HERE                 │
│  - Maps FHIR → OASIS+ format                                │
│  - Manages authentication session                           │
│  - Submits to OASIS+ API/UI                                 │
│  - Handles errors and retries                               │
│  - Audit logging                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  OASIS+ System (http://128.1.1.185)                         │
│  - Insurance company adjudication system                    │
│  - Processes claim                                          │
│  - Returns approval/denial                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📍 Current Location

```
C:\Users\rcmrejection3\nphies-rcm\brainsait-rcm\
└── services/
    └── oasis-integration/          ← YOU ARE HERE
        ├── scripts/
        │   └── discover-oasis.ts   ← The automation script
        ├── package.json
        ├── .env                    ← Credentials configured
        ├── README.md               ← Full documentation
        ├── QUICKSTART.md           ← Quick guide
        └── tsconfig.json
```

## 🔐 Security Note

The `.env` file contains OASIS+ credentials (`U29958 / U29958`). This file is:
- ✅ Already in `.gitignore` (won't be committed)
- ✅ Used only locally
- ⚠️ **DO NOT** commit or share publicly

For production deployment:
- Credentials will be stored in Kubernetes Secrets
- Session tokens will be encrypted
- Screenshots (may contain PHI) will be stored securely

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to OASIS+ | `ping 128.1.1.185` to verify network access |
| Login fails | Run `npm run discover:headed` to watch browser |
| Script hangs | Press Ctrl+C, check `screenshots/error-*.png` |
| No claim form found | Script will log available links, navigate manually in headed mode |
| Partial output | Check `discovery-output/oasis-discovery.json`, look at `errors` array |

## 📞 Next Communication

After you run the script, share with me:

**Option 1: Full Data** (Best)
```bash
cat discovery-output/oasis-discovery.json
```

**Option 2: Summary** (Quick)
- "Found 25 fields on claim form"
- "Main API: POST /api/claims/submit"
- "Session: JSESSIONID cookie"
- "Attached screenshot of claim form"

**Option 3: Issues**
- "Login failed, see error screenshot"
- "Claim form not found, but here's home page"

## ✅ Ready to Run!

Everything is installed and configured. Just run:

```bash
cd C:\Users\rcmrejection3\nphies-rcm\brainsait-rcm\services\oasis-integration
npm run discover:headed
```

Watch the magic happen! 🎭
