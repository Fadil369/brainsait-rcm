# GitOps Pipeline for BrainSAIT RCM Platform

**Owner:** Platform Engineering Team  
**Last Updated:** October 5, 2025

## Overview

This directory defines the GitOps workflow, repository structure, and deployment automation for the BrainSAIT RCM platform. We use **ArgoCD** as the GitOps operator with **Kustomize** for manifest templating.

## GitOps Philosophy

- **Single Source of Truth:** All infrastructure and application state defined in Git
- **Declarative Configuration:** Desired state expressed in YAML manifests
- **Automated Sync:** ArgoCD continuously reconciles cluster state with Git
- **Immutable Artifacts:** Container images tagged with commit SHA, never `latest`
- **Policy as Code:** OPA policies validate all changes pre-deployment

## Repository Structure

```
brainsait-rcm/
├── infrastructure/
│   ├── kubernetes/              # K8s manifests (this repo)
│   └── gitops/                  # GitOps configs (this directory)
│       ├── argocd/              # ArgoCD application definitions
│       ├── policies/            # OPA policies
│       └── README.md            # This file
├── services/                    # Microservice source code
│   ├── claims-scrubbing/
│   ├── fhir-gateway/
│   └── ...
└── apps/                        # Application source code
    ├── api/
    └── web/
```

## Environment Promotion Flow

```
Developer Commit → CI Build → Dev Deploy → Staging Deploy → Production Deploy
       ↓              ↓           ↓             ↓                ↓
   Git Push      Docker Build  Auto-sync    Manual PR      Manual Approval
                  + Tests                   + E2E Tests    + Policy Check
```

### Environment Characteristics

| Environment | Namespace | Auto-Sync | Approval | Purpose |
|-------------|-----------|-----------|----------|---------|
| **Dev** | `brainsait-dev` | ✅ Enabled | None | Rapid iteration, feature testing |
| **Staging** | `brainsait-staging` | ✅ Enabled | PR Review | Pre-production validation, E2E tests |
| **Production** | `brainsait-production` | ❌ Manual | Change Board | Live customer traffic |

## ArgoCD Application Structure

### Root Application (App of Apps Pattern)

```yaml
# argocd/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: brainsait-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Fadil369/brainsait-rcm.git
    targetRevision: main
    path: infrastructure/gitops/argocd/apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Service Applications

Each microservice has its own ArgoCD Application:

```yaml
# argocd/apps/claims-scrubbing-production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: claims-scrubbing-production
  namespace: argocd
spec:
  project: brainsait-production
  source:
    repoURL: https://github.com/Fadil369/brainsait-rcm.git
    targetRevision: main
    path: infrastructure/kubernetes/services/claims-scrubbing
    kustomize:
      namePrefix: production-
      commonLabels:
        environment: production
  destination:
    server: https://kubernetes.default.svc
    namespace: brainsait-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: false  # Manual approval for production
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  # Pre-sync hook: Run OPA policy checks
  syncPolicy:
    preSyncHook:
      - name: opa-validate
        manifest: |
          apiVersion: batch/v1
          kind: Job
          metadata:
            generateName: opa-validate-
          spec:
            template:
              spec:
                containers:
                - name: opa
                  image: openpolicyagent/opa:latest
                  command: ["opa", "test", "/policies"]
                restartPolicy: Never
```

## Deployment Workflow

### 1. Developer Workflow

```bash
# 1. Create feature branch
git checkout -b feature/claims-validation-enhancement

# 2. Make changes to service code
vim services/claims-scrubbing/src/validators.py

# 3. Update image tag in K8s manifest
vim infrastructure/kubernetes/services/claims-scrubbing/deployment.yaml
# Change image: brainsait/claims-scrubbing:v1.2.3 → v1.2.4

# 4. Commit and push
git add .
git commit -m "feat: add NPHIES eligibility date validation"
git push origin feature/claims-validation-enhancement

# 5. Create PR (CI runs tests, builds image)
gh pr create --title "Add NPHIES eligibility validation" --base main
```

### 2. CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/service-deploy.yml
name: Service CI/CD
on:
  push:
    paths:
      - 'services/**'
      - 'infrastructure/kubernetes/services/**'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run unit tests
        run: |
          cd services/claims-scrubbing
          python -m pytest tests/ --cov --cov-report=xml
      
      - name: Build Docker image
        run: |
          docker build -t brainsait/claims-scrubbing:${{ github.sha }} \
            services/claims-scrubbing/
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push brainsait/claims-scrubbing:${{ github.sha }}
      
      - name: Update K8s manifest
        run: |
          cd infrastructure/kubernetes/services/claims-scrubbing
          kustomize edit set image brainsait/claims-scrubbing:${{ github.sha }}
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "chore: update claims-scrubbing to ${{ github.sha }}"
          git push
```

### 3. ArgoCD Auto-Sync

- **Dev Environment:** ArgoCD detects manifest change and auto-syncs within 3 minutes
- **Staging Environment:** Auto-syncs after PR merged to `main`
- **Production Environment:** Manual sync triggered after approval

### 4. Production Promotion

```bash
# 1. Verify staging deployment
kubectl get pods -n brainsait-staging -l app=claims-scrubbing
argocd app wait claims-scrubbing-staging --health

# 2. Run E2E tests against staging
./scripts/run-e2e-tests.sh staging

# 3. Create production promotion PR
gh pr create \
  --title "Production Release: Claims Scrubbing v1.2.4" \
  --body "Changelog: Added NPHIES eligibility validation. Staging verified." \
  --base main \
  --label production-release

# 4. Change board approval (manual step)

# 5. Merge PR, then trigger ArgoCD sync
argocd app sync claims-scrubbing-production --prune
```

## Policy Enforcement (OPA)

### Pre-Deployment Policies

All changes must pass these checks:

```rego
# policies/production-policies.rego
package brainsait.production

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext
  msg = "Deployments must define securityContext"
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits
  msg = sprintf("Container %v must define resource limits", [container.name])
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg = sprintf("Container %v cannot use :latest tag", [container.name])
}

deny[msg] {
  input.kind == "Deployment"
  input.metadata.namespace == "brainsait-production"
  not input.metadata.labels.compliance
  msg = "Production deployments must have compliance label"
}
```

### Runtime Policies (Gatekeeper)

```yaml
# Enforce pod security standards
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: deny-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - brainsait-production
      - brainsait-staging
```

## Rollback Procedures

### Automated Rollback

ArgoCD automatically rolls back if:
- Health checks fail after sync
- Readiness probe failures exceed threshold

### Manual Rollback

```bash
# Option 1: ArgoCD rollback to previous revision
argocd app rollback claims-scrubbing-production

# Option 2: Revert Git commit
git revert HEAD
git push origin main
# ArgoCD auto-syncs the revert

# Option 3: Pin to specific revision
argocd app sync claims-scrubbing-production --revision <commit-sha>
```

## Secrets Management

### Sealed Secrets Workflow

```bash
# 1. Create secret locally (never commit!)
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=<secure-password> \
  --dry-run=client -o yaml > secret.yaml

# 2. Seal the secret
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# 3. Commit sealed secret (safe to commit)
git add infrastructure/kubernetes/base/secrets/sealed-secret.yaml
git commit -m "chore: add sealed MongoDB credentials"
git push

# 4. ArgoCD applies, SealedSecrets controller decrypts in-cluster
```

### Vault Integration (Alternative)

```yaml
# External secret synced from Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mongodb-credentials
  namespace: brainsait-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: mongodb-credentials
  data:
    - secretKey: username
      remoteRef:
        key: secret/data/mongodb/production
        property: username
    - secretKey: password
      remoteRef:
        key: secret/data/mongodb/production
        property: password
```

## Monitoring & Alerts

### ArgoCD Health Notifications

```yaml
# Slack notifications on sync failures
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]
  template.app-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed!
      Details: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
```

### Deployment Metrics

Track via Prometheus:
- `argocd_app_sync_total`: Total sync operations
- `argocd_app_sync_status`: Current sync status (0=failed, 1=success)
- Deployment frequency, lead time, MTTR

## Security Best Practices

1. **Least Privilege:** ArgoCD service account has minimal RBAC permissions
2. **Image Scanning:** Trivy scans all images pre-deployment
3. **SOPS Encryption:** All secrets encrypted at rest in Git
4. **Audit Logging:** All ArgoCD operations logged to immutable storage
5. **MFA Required:** Production sync operations require multi-factor auth

## Disaster Recovery

### Backup Strategy

```bash
# Daily automated backups of ArgoCD state
argocd admin export > backups/argocd-backup-$(date +%Y%m%d).yaml

# Store in S3/Blob with 90-day retention
aws s3 cp backups/argocd-backup-$(date +%Y%m%d).yaml \
  s3://brainsait-dr-backups/argocd/
```

### Cluster Recreation

```bash
# 1. Restore ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Apply root application
kubectl apply -f infrastructure/gitops/argocd/root-app.yaml

# 3. ArgoCD syncs entire platform from Git
argocd app sync brainsait-platform --cascade
```

## Next Steps

1. Install ArgoCD in cluster: `kubectl apply -f argocd/install.yaml`
2. Configure SSO with Azure AD / Okta
3. Set up Slack notifications for production syncs
4. Implement OPA policies for compliance validation
5. Create runbooks for common deployment scenarios
