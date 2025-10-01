# Contributing to BrainSAIT RCM

Thank you for your interest in contributing to the BrainSAIT Healthcare Claims Management System! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a professional code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize patient data security and HIPAA compliance
- Follow Saudi healthcare regulations and NPHIES standards

## Getting Started

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm)
- **Python** 3.12+
- **MongoDB** (local or Atlas)
- **Redis** (optional, for caching)
- **Git**

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/Fadil369/brainsait-rcm.git
cd brainsait-rcm

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Start development servers
pnpm dev
```

## Development Workflow

### Branching Strategy

We follow a **feature branch workflow**:

- `main` – production-ready code
- `develop` – integration branch for features
- `feature/*` – new features
- `fix/*` – bug fixes
- `refactor/*` – code improvements
- `docs/*` – documentation updates

### Commit Messages

Follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` – new feature
- `fix` – bug fix
- `docs` – documentation changes
- `style` – formatting, no code change
- `refactor` – code restructuring
- `test` – adding/updating tests
- `chore` – maintenance tasks

**Examples:**
```
feat(dashboard): add fraud detection alerts panel
fix(api): correct rejection date timezone handling
docs(readme): update deployment instructions
```

## Code Standards

### TypeScript/JavaScript

- **ESLint** and **Prettier** configurations are enforced
- Use functional components with hooks
- Prefer `const` over `let`
- Use TypeScript strict mode
- Document complex logic with JSDoc comments

**Example:**
```typescript
/**
 * Normalizes rejection data from various API response formats.
 * @param record - Raw rejection record from API
 * @returns Normalized rejection object
 */
function normalizeRejection(record: any): NormalizedRejection {
  // Implementation
}
```

### Python

- Follow **PEP 8** style guide
- Use type hints (`from __future__ import annotations`)
- Document functions with docstrings
- Maximum line length: 100 characters
- Use `black` formatter and `ruff` linter

**Example:**
```python
def analyze_fraud(claims: list[dict]) -> FraudAnalysisResult:
    """
    Analyze claims for potential fraud patterns.

    Args:
        claims: List of claim dictionaries

    Returns:
        FraudAnalysisResult with suspicious claims flagged
    """
    # Implementation
```

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Define custom styles in CSS modules when needed
- Follow mobile-first responsive design
- Ensure RTL (Arabic) layout compatibility
- Maintain accessibility (WCAG AA)

## Testing

### Frontend Tests

```bash
cd apps/web
pnpm test           # Run unit tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

**Required:**
- Unit tests for utility functions
- Component tests for interactive UI
- Integration tests for API hooks
- Accessibility tests (axe-core)

### Backend Tests

```bash
cd apps/api
pytest tests/                      # All tests
pytest tests/test_api.py -v       # Specific file
pytest --cov=. --cov-report=html  # Coverage
```

**Required:**
- Unit tests for business logic
- Integration tests for API endpoints
- Security tests for authentication
- Performance tests for ML pipelines

### End-to-End Tests

```bash
# Coming soon: Playwright E2E tests
pnpm test:e2e
```

## Pull Request Process

### Before Submitting

1. **Update from main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run checks locally:**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

3. **Update documentation** if needed (README, API docs, CHANGELOG)

### PR Guidelines

- **Title:** Clear, descriptive summary (follows conventional commits)
- **Description:** Explain what, why, and how
  - Link related issues (`Fixes #123`)
  - Include screenshots for UI changes
  - List breaking changes
  - Note any migration steps required

- **Size:** Keep PRs focused and reviewable (< 500 lines preferred)
- **Tests:** Include tests for new features/fixes
- **Docs:** Update relevant documentation

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by at least one maintainer
3. **Security review** for authentication/data handling changes
4. **Accessibility review** for UI changes
5. **Approval** required before merge

### Merge Strategy

- **Squash and merge** for feature branches
- **Rebase and merge** for small fixes
- **Merge commit** for release branches

## Issue Reporting

### Bug Reports

Include:
- **Environment:** Browser/OS, Node/Python versions
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots/logs** if applicable
- **Severity:** Critical, High, Medium, Low

### Feature Requests

Include:
- **Use case:** Who benefits and why
- **Proposed solution**
- **Alternatives considered**
- **Impact on existing features**

### Security Issues

**DO NOT** open public issues for security vulnerabilities.
Email: security@brainsait.com

## Architecture Guidelines

### Frontend (Next.js)

- Use **App Router** (not Pages Router)
- Server Components by default, Client Components when needed
- Co-locate components with their tests
- Extract shared logic into custom hooks
- Use React Query for server state management

### Backend (FastAPI)

- Follow async/await patterns
- Use dependency injection for services
- Implement proper error handling and logging
- Validate inputs with Pydantic models
- Document endpoints with OpenAPI schemas

### Database

- Use MongoDB transactions for multi-document operations
- Index frequently queried fields
- Implement soft deletes for audit trails
- Follow HIPAA data retention policies

### Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Implement rate limiting and request validation
- Follow principle of least privilege
- Log security events for audit

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [NPHIES Integration Guide](https://nphies.sa)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)

## Questions?

- **General:** Open a discussion on GitHub
- **Technical:** Ask in team Slack/Discord
- **Security:** security@brainsait.com
- **Commercial:** hello@brainsait.com

---

Thank you for contributing to better healthcare technology! 🏥💙
