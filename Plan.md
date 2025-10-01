# Modernization Plan

## 1. Repository Inventory
- Full file and directory listing captured in `repo-file-list.txt` (generated via `find . -print`).
- Key workspace pillars:
  - `apps/web` – Next.js 14 dashboard (primary frontend)
  - `apps/api` – FastAPI backend
  - `apps/api-worker` & `workers/scheduler` – Cloudflare worker / schedulers
  - `packages/*` – shared Node.js packages (claims engine, compliance reporter, etc.)
  - `services/*` – auxiliary Python services (fraud detection, analytics, WhatsApp, etc.)
  - Root-level documentation (`README.md`, guides) and deployment scripts (`deploy.sh`, `render.yaml`, `wrangler.toml`).

## 2. Candidates for Removal / Archival
| Path | Rationale | Action |
|------|-----------|--------|
| `apps/web/out/` | Static export artifact from previous builds; reproducible via `next export`. | Remove after confirmation.
| `apps/web/.next/` | Local build cache; should not be committed. | Remove after confirmation.
| `apps/web/public/demo/` (legacy assets) | New modernization will replace with refreshed demo shell; evaluate existing content for merge before removal. | Replace with new assets; archive originals in branch/tag if needed.
| `test-hash.js`, `test-rejection.json` (root) | Local testing utilities; duplicate functionality elsewhere. | Confirm unused and remove or move under `/scripts`.
| `apps/web/.env.local` | Contains environment secrets; should not be committed. | Replace with example template only (retain `.env.local.example`).
| `node_modules/`, `apps/web/node_modules/` (if present) | Should be excluded from repo; ensure `.gitignore` coverage. | Remove from repository, rely on package managers.

> **Guardrail:** No destructive deletions will occur until this plan is approved. All removals will be executed in dedicated commits/PRs with diffs for review.

## 3. Migrations & Structural Normalization
Target layout (aligned with request) and mapping approach:

```
/src
  /components        → Consolidate shared React UI primitives (from `apps/web/src/components`)
  /pages or /routes  → Next.js `app` directory will remain under `apps/web/src/app`; consider aliasing via TS config instead of hard move to avoid breaking Next.js routing.
  /styles            → Move `globals.css`, Tailwind config adjustments, and new design tokens.
  /lib               → Existing utilities (`apps/web/src/lib`).
/public              → Preserve public assets; include modernized demo shell.
/scripts             → Move build/deployment scripts (`deploy.sh`, `install.sh`, custom node scripts`).
/config              → Centralize `turbo.json`, `wrangler.toml`, deployment manifests (`render.yaml`, `cf-pages.toml` new file).
```

**Execution notes:**
- Because this is a monorepo, we will create a top-level `/src` that re-exports `apps/web` components through barrel files, avoiding large-scale directory moves in the first iteration.
- Introduce path aliases in `tsconfig.json` (Next.js + packages) to reference consolidated modules.
- Maintain compatibility with TurboRepo workspace expectations (`apps/*`, `packages/*`).

## 4. Refactor & Modernization Plan
- **Frontend (Next.js):**
  - Replace public demo shell with modular `demo.css`/`demo.js` already staged; ensure responsive, RTL-friendly design and ARIA-compliant tab panels.
  - Audit `RejectionDashboard.tsx` and supporting modals for complexity; extract view/layout helpers (implement missing `ActionModals`, `DashboardView`).
  - Standardize design system (colors, typography) via CSS variables/Tailwind theme updates.
  - Enable skeleton/loading states and optimistic UI flows for API-triggering buttons.
- **Backend (FastAPI & shared packages):**
  - Review `apps/api/main.py` and `apps/web/src/lib/api.ts` for retry/timeouts, structured error taxonomy, and authentication refresh flows.
  - Add mock adapters for demo environments.
  - Ensure worker scripts align with Cloudflare Workers deployment (evaluate `wrangler.toml`).
- **Tooling:**
  - Introduce ESLint/Prettier configs at repo root with extends per workspace.
  - Add smoke tests for critical flows (React Testing Library for dashboard, pytest for API health route).

## 5. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Breaking Next.js routing by restructuring directories | Use TypeScript path aliases and incremental refactors; keep `apps/web/src/app` structure intact. |
| Removing files that are referenced in deployment scripts | Perform code search prior to deletions; document references in Plan.md and commit messages. |
| CI/CD secrets & environment differences | Provide templated configs (`cf-pages.toml`, GitHub Actions secrets placeholders); require manual secret injection. |
| Accessibility regressions | Integrate automated checks (e.g., `eslint-plugin-jsx-a11y`, `axe-core` in tests) and manual review. |

## 6. Rollback Strategy
- All changes grouped into atomic commits (removals, refactors, tooling, CI/CD) to simplify selective rollback.
- Maintain feature branches for modernization work; avoid force pushes to `main`.
- Create git tags prior to major restructuring (e.g., `pre-modernization-backup`).
- Document manual steps (Cloudflare deployment, environment variable changes) in `CHANGELOG.md` and `DEPLOYMENT.md`.

## 7. Next Steps Pending Approval
1. Confirm candidate removals and restructuring approach outlined above.
2. Upon approval, execute staged commits:
   - **Commit 1:** Remove build artifacts (`out/`, `.next/`), relocate scripts, update `.gitignore`.
   - **Commit 2:** Modernize public demo shell (`index.html`, `demo.css`, `demo.js`).
   - **Commit 3:** Refactor dashboard components, integrate API enhancements, add mocks.
   - **Commit 4:** Tooling updates (ESLint/Prettier, tests).
   - **Commit 5:** CI/CD workflow for Cloudflare.
3. Update documentation (`README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`).

Please review and approve this plan (or request adjustments). No further modifications will be applied until approval is received.
