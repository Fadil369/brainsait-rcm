# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

**@brainsait/shared-models** - Shared TypeScript and Python domain models for the BrainSAIT Healthcare Claims Management System. This package is the single source of truth for all data types used across the monorepo (Next.js web app, React Native mobile, FastAPI backend).

### Key Technologies
- **TypeScript**: Primary type definitions with Zod schemas for runtime validation
- **Zod**: Runtime validation and type inference
- **Python**: Minimal Python exports (version only, placeholder for future Python type definitions)

## Commands

### Build
```bash
npm run build     # Compile TypeScript to dist/ (generates .js + .d.ts)
```

### Testing
```bash
npm test          # Run Jest tests
```

### Linting
```bash
npm run lint      # ESLint on all TypeScript files
```

## Architecture

### Dual-Language Type System
This package provides types for **both** TypeScript (apps/web, apps/mobile) and Python (apps/api) consumers:

- **TypeScript exports**: `src/index.ts` → compiled to `dist/index.js` + `dist/index.d.ts`
- **Python exports**: `python/__init__.py` (currently minimal, will mirror TypeScript types as needed)

### Type Definition Strategy

**Schema-First with Zod**: All complex types start as Zod schemas, then TypeScript types are inferred:

```typescript
// 1. Define Zod schema for runtime validation
export const ClaimValidationRequestSchema = z.object({ ... });

// 2. Infer TypeScript type from schema
export type ClaimValidationRequest = z.infer<typeof ClaimValidationRequestSchema>;
```

This pattern ensures:
- Runtime validation in API boundaries (FastAPI receives JSON, validates with Zod)
- Compile-time type safety in TypeScript apps
- Single source of truth for structure

### Type Categories

1. **Validation Request/Response Types** (`ClaimValidation*`, `ComplianceStatus`, `AutoCodingSuggestion`)
   - Used for AI-powered claim scrubbing API calls
   - All have Zod schemas for validation
   - Include risk scoring (0-100) and NPHIES compliance checks

2. **Domain Entity Types** (`Claim`, `DenialRecord`, `Branch`, `User`)
   - Core business entities persisted in MongoDB
   - Plain TypeScript interfaces (no Zod schemas currently)
   - Include status enums and timestamps

3. **Enums** (`RiskLevel`, `IssueSeverity`, `ClaimStatus`)
   - Shared across all apps for consistent state representation
   - TypeScript `enum` (not string unions) for nominal typing

4. **API Infrastructure** (`APIResponse<T>`, `PaginationParams`)
   - Generic wrappers for consistent API response shapes
   - Used by FastAPI backend and Next.js data fetching

## Critical Implementation Rules

### Adding New Types

1. **For validation/request types**: Always create Zod schema first, then infer TypeScript type
   ```typescript
   export const NewTypeSchema = z.object({ ... });
   export type NewType = z.infer<typeof NewTypeSchema>;
   ```

2. **For domain entities**: Use plain TypeScript interfaces unless runtime validation is needed
   ```typescript
   export interface NewEntity {
     id: string;
     // ...fields
   }
   ```

3. **For status/category values**: Use TypeScript `enum`, not string unions
   ```typescript
   export enum NewStatus {
     PENDING = 'pending',
     ACTIVE = 'active'
   }
   ```

### Type Naming Conventions

- **Schemas**: `PascalCaseSchema` (e.g., `ClaimValidationRequestSchema`)
- **Inferred types**: Same as schema without `Schema` suffix (e.g., `ClaimValidationRequest`)
- **Enums**: `PascalCase` with singular nouns (e.g., `ClaimStatus`, not `ClaimStatuses`)
- **Interfaces**: `PascalCase` (e.g., `DenialRecord`)

### Risk Scoring System

When adding/modifying validation types:
- `denialRiskScore`: 0-100 scale (0 = no risk, 100 = certain denial)
- `riskLevel`: Enum-based categorization (LOW < 25, MEDIUM 25-50, HIGH 50-75, CRITICAL > 75)
- Always include both numeric score + categorical level for flexible UI rendering

### NPHIES Compliance

Validation responses include `ComplianceStatus` with three checks:
- `nphiesMds`: Minimum Data Set compliance (required fields per NPHIES spec)
- `payerRules`: Payer-specific validation rules (loaded from payer config)
- `eligibility`: Patient coverage verification (active policy check)

Each check returns `'pass' | 'fail' | 'warning'` (use string literals, not boolean).

### Date Formatting

All date fields use ISO 8601 strings:
- `serviceDate`: `YYYY-MM-DD` format (enforced via Zod regex)
- Timestamps (`createdAt`, `updatedAt`, `deniedAt`): Full ISO strings with timezone

### Financial Amounts

Currently stored as single `number` values (e.g., `totalAmount`, `deniedAmount`).

**Note**: Parent monorepo uses `{ net, vat, total }` structure. Consider refactoring these types to match if VAT breakdown is needed at the model level.

## File Organization

```
src/index.ts              # Single file export (all types)
  ├── Enums               # RiskLevel, IssueSeverity, ClaimStatus
  ├── Zod Schemas         # Runtime validation schemas
  ├── Inferred Types      # Types derived from Zod schemas
  ├── Additional Types    # Plain interfaces (Claim, DenialRecord, etc.)
  └── API Wrappers        # APIResponse, PaginationParams

python/__init__.py        # Python package (minimal, version only)
dist/                     # Compiled output (gitignored)
  ├── index.js            # CommonJS bundle
  └── index.d.ts          # TypeScript declarations
```

## Consumer Usage

### TypeScript Consumers (apps/web, apps/mobile)
```typescript
import { ClaimValidationRequest, ClaimStatus, RiskLevel } from '@brainsait/shared-models';

const request: ClaimValidationRequest = { /* ... */ };
```

### Python Consumers (apps/api)
```python
# Currently: Version info only
from shared_models import __version__

# Future: Full type definitions with Pydantic
# from shared_models import ClaimValidationRequest
```

### Zod Schema Usage (FastAPI validation)
```typescript
import { ClaimValidationRequestSchema } from '@brainsait/shared-models';

// Validate incoming JSON
const result = ClaimValidationRequestSchema.safeParse(jsonData);
if (!result.success) {
  // Handle validation errors
}
```

## Rebuilding After Changes

**Important**: After modifying `src/index.ts`, always rebuild:

```bash
npm run build
```

Consumers (apps/web, apps/api) import from `dist/`, not `src/`. Failing to rebuild will cause stale types in consuming apps.

## Future Enhancements

- **Python type definitions**: Add Pydantic models in `python/` to mirror TypeScript types
- **VAT structure**: Consider adding `{ net, vat, total }` to financial fields
- **Bilingual types**: Add `BilingualText = { ar: string, en: string }` if UI text moves to models
- **Test coverage**: Add Jest tests for Zod schema validation edge cases
