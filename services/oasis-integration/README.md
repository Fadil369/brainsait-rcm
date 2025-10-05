# OASIS+ Integration Service

Automated integration with OASIS+ (Optimized Adjudication System for Insurance Services) for the BrainSAIT Healthcare Claims Management Platform.

## Features

- **Automated Discovery**: Playwright-based script to document OASIS+ structure
- **Network Interception**: Captures all API endpoints and request/response formats
- **Form Field Mapping**: Extracts all form fields, validation rules, and dropdown options
- **Screenshot Documentation**: Visual documentation of each workflow step
- **Type Generation**: Automatic TypeScript type generation from discovered forms
- **Session Management**: Handles authentication and session persistence

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

```bash
cp .env.example .env
# Edit .env with your OASIS+ credentials
```

### 3. Run Discovery Script

**Headless Mode** (faster, production):
```bash
npm run discover
```

**Headed Mode** (watch browser, debugging):
```bash
npm run discover:headed
```

### 4. Review Output

The script generates:
- `discovery-output/oasis-discovery.json` - Complete structured data
- `discovery-output/OASIS_INTEGRATION_GUIDE.md` - Human-readable documentation
- `discovery-output/oasis-types.ts` - TypeScript type definitions
- `screenshots/*.png` - Visual documentation of each step

## What the Discovery Script Does

### Step 1: Login Analysis
- Detects login form fields (username, password)
- Identifies authentication method (POST, form-based, etc.)
- Captures session mechanism (cookies, tokens)

### Step 2: Authentication
- Logs in using provided credentials
- Captures session cookies
- Verifies successful authentication

### Step 3: Home Page Analysis
- Extracts available navigation options
- Detects OASIS+ version
- Maps application structure

### Step 4: Claim Submission
- Navigates to claim submission page
- Documents ALL form fields:
  - Field names and IDs
  - Field types (text, select, date, etc.)
  - Labels and placeholders
  - Required/optional status
  - Validation rules (patterns, min/max, etc.)
  - Dropdown options (for select fields)

### Step 5: Additional Pages
- Explores claim search/list pages
- Documents table structures
- Captures breadcrumb navigation

### Step 6: API Capture
- Intercepts all network requests
- Records endpoints, methods, headers
- Captures request/response bodies
- Measures response times

## Output Format

### JSON Structure
```json
{
  "timestamp": "2025-10-05T...",
  "oasisVersion": "2.5",
  "baseUrl": "http://128.1.1.185/prod/faces/Home",
  "authentication": {
    "loginUrl": "...",
    "loginMethod": "POST",
    "credentialFields": ["username", "password"],
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
            }
          ]
        }
      ]
    }
  },
  "apiEndpoints": [...]
}
```

### Generated TypeScript Types
```typescript
export interface OASISClaimSubmission {
  patientId: string;  // Patient ID
  serviceDate: string;  // Service Date
  icdCodes: string[];  // ICD-10 Codes
  // ... all discovered fields
}
```

## Next Steps After Discovery

Once the script completes:

1. **Review Documentation**: Check `OASIS_INTEGRATION_GUIDE.md`
2. **Validate Field Mappings**: Ensure all required fields are captured
3. **Map to FHIR**: Map OASIS fields to FHIR ClaimResponse resources
4. **Build Integration Service**: Use discovered structure to build API client
5. **Deploy to Kubernetes**: Production deployment with secrets management

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OASIS_URL` | OASIS+ base URL | `http://128.1.1.185/prod/faces/Home` |
| `OASIS_USERNAME` | Login username | `U29958` |
| `OASIS_PASSWORD` | Login password | `U29958` |
| `HEADED` | Run browser in headed mode | `false` |
| `SCREENSHOT_PATH` | Screenshot output directory | `./screenshots` |
| `OUTPUT_PATH` | Documentation output directory | `./discovery-output` |

## Troubleshooting

### Login Fails
- Verify credentials in `.env`
- Run in headed mode to see browser: `npm run discover:headed`
- Check if OASIS+ URL is accessible from your network

### Form Fields Not Detected
- OASIS+ may use JavaScript to dynamically load forms
- Script includes waits for `networkidle` state
- Add custom waits in `discover-oasis.ts` if needed

### API Endpoints Not Captured
- Ensure network interception is working
- Check console output for `📤` (request) and `📥` (response) logs
- Static resources (.css, .png) are filtered out automatically

### Timeout Errors
- Increase timeout in `.env`: `TIMEOUT=60000` (60 seconds)
- Check network connectivity to OASIS+ server
- Verify server is responsive

## Architecture Integration

This service fits into the BrainSAIT platform as:

```
Frontend (Next.js/React Native)
    ↓
Claims Validation API (FastAPI)
    ↓
FHIR Gateway (apps/api)
    ↓
OASIS+ Integration Service ← YOU ARE HERE
    ↓
OASIS+ System (http://128.1.1.185)
```

## Security Considerations

- **Credentials**: Never commit `.env` file
- **Session Tokens**: Stored in memory, not logged
- **Screenshots**: May contain PHI, store securely
- **API Logs**: Sanitize before sharing

## Development

```bash
# Build TypeScript
npm run build

# Run linter
npm run lint

# Run tests
npm test

# Start integration service (after discovery)
npm run dev
```

## License

PROPRIETARY - BrainSAIT Team
