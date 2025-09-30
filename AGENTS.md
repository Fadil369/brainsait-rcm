# Repository Guidelines

## Project Structure & Module Organization
- Turborepo monorepo; primary surfaces live under `apps/`.
- `apps/web` (Next.js 14, App Router), `apps/mobile` (Expo), `apps/api` (FastAPI + MongoDB + Celery).
- Shared domain packages in `packages/` (`rejection-tracker`, `notification-service`, `compliance-reporter`); extend these before duplicating logic.
- Python microservices under `services/` (fraud detection, predictive analytics, WhatsApp notifications); infra scripts in `infrastructure/`, containers via `docker-compose.yml`.

## Build, Test, and Development Commands
- Bootstrap once with `npm install`; install Python requirements per service (`pip install -r apps/api/requirements.txt` etc.).
- Turborepo pipelines: `npm run dev` for all apps, `npm run build` for production bundles, `npm run clean` to drop artefacts.
- Targeted workflows: `cd apps/web && npm run dev`, `cd apps/api && uvicorn main:app --reload`, `cd apps/mobile && npm start`.
- Operational helpers: `npm run lint`, `npm test` (`turbo run test`), `npm run docker:up`/`docker:down`, `npm run db:migrate`.

## Coding Style & Naming Conventions
- TypeScript uses 2-space indentation, ESLint (`eslint-config-next`) and tailwind-first styling; components in `PascalCase`, hooks `useCamelCase`, files `kebab-case.tsx`.
- React Native code stays functional with typed props; assets live in `apps/mobile/assets`.
- Python sticks to PEP 8 (4-space indents, type hints, module-level `logger`); FastAPI schemas remain in `apps/api` and services group by feature.
- Bilingual content must use `{ ar: string; en: string }` helpers; financial data exposes net/VAT/total fields.

## Testing Guidelines
- `npm test` fans out through Turborepo; place Jest + Testing Library suites in `apps/web/src/__tests__` or `packages/*/src/__tests__`.
- Mobile tests run via `cd apps/mobile && npm test`; limit snapshots to static UI surfaces.
- Python services rely on `pytest`; create `services/*/tests/` packages, mock external systems, and assert regulatory rules like 30-day deadlines and VAT math.

## Commit & Pull Request Guidelines
- Repository snapshot lacks Git history; follow Conventional Commits in imperative mood (e.g., `feat: add NPHIES claim audit`).
- Keep commits scoped to one surface, bundling schema or env file changes that they require.
- PRs must link issues, list env or migration steps, and attach screenshots or sample payloads; verify `npm run lint`, `npm test`, and relevant `pytest` suites before requesting review.

## Security & Compliance Essentials
- Copy `.env.example` for new secrets, document them in `DEPLOYMENT.md`, and never commit credential files.
- Log every PHI touch via the audit logger; avoid printing identifiers to stdout.
- Validate claim payloads through the FHIR validator service and deliver bilingual user-facing copy by default.
