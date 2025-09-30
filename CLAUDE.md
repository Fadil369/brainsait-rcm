# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BrainSAIT Healthcare Claims Management System** - A comprehensive medical insurance claims and rejections management platform for Saudi Arabian healthcare providers, with full NPHIES (Saudi National Platform for Health Insurance Exchange Services) integration and FHIR R4 compliance.

### Key Technologies
- **Frontend**: Next.js (apps/web), React Native (apps/mobile)
- **Backend**: FastAPI (apps/api)
- **Database**: MongoDB
- **Cache**: Redis
- **Validation**: FHIR R4 resources
- **UI**: Mesh gradients (@paper-design/shaders-react), Framer Motion, Glass morphism design
- **Integration**: NPHIES API, FHIR validator service

### Language Support
- **Bilingual**: Full Arabic (RTL) and English (LTR) support throughout the application
- All user-facing content must be provided in both languages
- Date formatting adapts to locale (`ar-SA` vs `en-US`)

## Architecture

### Monorepo Structure
```
apps/
  ├── web/           # Next.js dashboard (primary interface)
  ├── mobile/        # React Native app
  └── api/           # FastAPI backend

packages/
  ├── claims-engine/      # Core claims processing logic
  ├── rejection-tracker/  # Rejection management system
  ├── compliance-reporter/# Automated reporting (Excel)
  └── notification-service/# Compliance letters & alerts

services/
  ├── nphies-integration/ # NPHIES API client
  ├── fhir-validator/     # FHIR R4 validation
  └── audit-logger/       # HIPAA-compliant audit logging
```

### Core Data Models

**RejectionRecord** (`packages/rejection-tracker/src/types.ts`):
- Tracks medical claim rejections with financial data (net + VAT)
- Manages appeal lifecycle (PENDING_REVIEW → UNDER_APPEAL → RECOVERED/FINAL_REJECTION)
- Enforces 30-day compliance tracking per Saudi regulations
- Includes physician analysis for fraud detection

**ComplianceLetter** (`packages/notification-service/src/complianceLetters.ts`):
- Types: INITIAL_NOTIFICATION, WARNING_FINAL, INFORMATION_REQUEST
- Bilingual templates (Arabic/English)
- Auto-generated at claim submission and 30-day deadline

**CorrectiveActionPlan** (`packages/claims-engine/src/correctiveActions.ts`):
- Branch-specific or general improvement plans
- Training requirements tracking
- Effectiveness metrics monitoring

## Development Commands

### Setup & Installation
```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with credentials

# Start all services
docker-compose up -d

# Run database migrations
npm run db:migrate
```

### Development
```bash
# Start development server (Next.js dashboard)
npm run dev

# Start API server
cd apps/api && uvicorn main:app --reload

# Run tests
npm test
pytest  # For Python services
```

### Production Build
```bash
# Build web dashboard
npm run build

# Build Docker images
docker-compose build
```

## Critical Implementation Rules

### 1. HIPAA & Data Privacy
- **ALL** data access must be logged via `audit_log()` function (apps/api)
- Patient data must be encrypted at rest (use ENCRYPTION_KEY env var)
- Include audit trail in all record modifications
- Never log sensitive data (PHI, credentials) to console or standard logs

### 2. FHIR R4 Compliance
- Validate all claim data using `validate_fhir_claim_response()` before processing
- Use FHIR ClaimResponse resources for rejection data
- Map Saudi/NPHIES codes to FHIR terminology systems
- Reference: http://hl7.org/fhir/R4/claimresponse.html

### 3. NPHIES Integration
- All claim submissions go through NPHIES API (`services/nphies-integration/`)
- Include NPHIES reference numbers in compliance letters
- Track reception mode: 'NPHIES', 'PORTAL', or 'EMAIL'
- Handle 30-day response deadline per Saudi regulations

### 4. Bilingual Requirements
- All UI text, letters, and reports must include both Arabic and English
- Use `BilingualText` type: `{ ar: string, en: string }`
- Dashboard components: Support RTL/LTR with `dir` attribute
- Excel reports: Use bilingual column headers (e.g., "Total Amount\nالمبلغ الإجمالي")

### 5. Financial Data
- Always include net + VAT breakdown in monetary amounts
- Structure: `{ net: number, vat: number, total: number }`
- Use SAR (Saudi Riyal) currency formatting
- Format for Arabic: `toLocaleString('ar-SA')`, English: `toLocaleString('en-US')`

### 6. Compliance Letters
- Generate INITIAL_NOTIFICATION at claim submission (sets 30-day deadline)
- Generate WARNING_FINAL after 30-day deadline automatically
- Use `ComplianceLetterService` class for all letter generation
- Include BrainSAIT branding and complete contact information

### 7. UI Design System
- **Neural Mesh Gradient**: Dual-layer mesh gradients (primary + wireframe overlay)
- **Color Palette**: Black base (#000000), Midnight Blue (#1a365d), Medical Blue (#2b6cb8), Violet (#5b21b6), Cyan (#0ea5e9)
- **Glass Morphism**: Use `.glass-morphism` class for card components
- **Animations**: Framer Motion for all transitions and interactions
- **Icons**: Use emoji icons (📊, 📧, ✅, ⚠️, etc.) for quick visual identification

## Common Workflows

### Adding a New Rejection
1. Validate FHIR compliance (`validate_fhir_claim_response()`)
2. Calculate metrics (initialRejectionRate, within30Days)
3. Create audit log entry
4. Store in MongoDB with proper indices
5. Trigger compliance letter if deadline exceeded

### Generating Monthly Report
1. Use `MonthlyReportGenerator` class (`packages/compliance-reporter/src/monthlyReport.ts`)
2. Generate three sheets: Main Report, Summary, Physician Analysis
3. Apply bilingual column headers
4. Set proper column widths for readability
5. Export as XLSX with date-based filename

### Creating Corrective Action Plan
1. Analyze rejection patterns with `CorrectiveActionService`
2. Identify root cause (documentation, coding, etc.)
3. Generate actionable items with due dates
4. Define effectiveness metrics (baseline → target)
5. Notify responsible parties (branch managers, physicians)

### Processing Appeal
1. Create AppealRequest from RejectionRecord
2. Attach supporting documents
3. Submit via appropriate channel (NPHIES/Portal/Email)
4. Track `submissionMethod` in database
5. Update rejection status to UNDER_APPEAL
6. Monitor for response and calculate recoveryRate

## Key Files to Understand

- `packages/rejection-tracker/src/types.ts` - Core data models
- `packages/notification-service/src/complianceLetters.ts` - Letter generation
- `packages/compliance-reporter/src/monthlyReport.ts` - Excel reporting
- `apps/web/components/RejectionDashboard.tsx` - Main UI component
- `apps/api/main.py` - FastAPI routes and business logic

## Testing Notes

- Mock NPHIES API responses in tests (use fixtures)
- Test bilingual output in both Arabic and English locales
- Verify FHIR validation with valid/invalid test data
- Test 30-day deadline calculations with various date scenarios
- Verify audit logging in all data access operations

## Deployment

- **Production**: Use Docker Compose with HTTPS certificates
- **Database**: MongoDB with authentication enabled
- **Secrets**: Store in environment variables (NPHIES_API_KEY, ENCRYPTION_KEY, MONGO_PASSWORD)
- **Logs**: Rotate logs at 10MB, keep 10 backups
- **Monitoring**: Check `/var/log/brainsait/api.log` for audit trail

## Saudi Healthcare Context

- **30-Day Rule**: Insurance companies must respond to claims within 30 days
- **NPHIES**: National platform mandated by Saudi Health Insurance Council
- **TPAs**: Third-Party Administrators manage claims for insurance companies
- **VAT**: 15% value-added tax on medical services in Saudi Arabia
- **Fraud Detection**: System flags patterns like duplicate billing, unbundling, upcoding, phantom billing