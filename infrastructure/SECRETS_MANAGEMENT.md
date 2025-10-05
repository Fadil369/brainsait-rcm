# Secrets Management for BrainSAIT RCM Platform

**Owner:** Security & Platform Engineering Team  
**Last Updated:** October 5, 2025

## Overview

This document defines the secrets management strategy for BrainSAIT RCM platform, ensuring PHI protection, compliance with HIPAA/NPHIES requirements, and operational security across all environments.

## Secrets Architecture

### Three-Layer Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Developer Workstation (Local Development)          │
│  - .env files (git-ignored)                                  │
│  - Docker secrets for local compose                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Git Repository (Encrypted at Rest)                 │
│  - SOPS-encrypted YAML files (commit-safe)                   │
│  - Sealed Secrets (public key encryption)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Runtime (Kubernetes Cluster)                       │
│  - HashiCorp Vault (dynamic secrets)                         │
│  - Azure Key Vault / AWS Secrets Manager                     │
│  - K8s Secrets (decrypted from SOPS/Sealed)                  │
└─────────────────────────────────────────────────────────────┘
```

## Secret Categories

| Category | Examples | Storage Method | Rotation Period |
|----------|----------|----------------|-----------------|
| **Database Credentials** | MongoDB root password, connection strings | Vault dynamic secrets | 90 days |
| **API Keys** | NPHIES API key, Payer API tokens | Sealed Secrets → Vault | 180 days |
| **TLS Certificates** | Service mesh mTLS certs, ingress certs | cert-manager automation | 90 days (auto) |
| **Service Tokens** | JWT signing keys, encryption keys | Vault transit engine | 365 days |
| **Cloud Provider** | Azure Service Principal, AWS IAM keys | Azure Key Vault / AWS SM | 90 days |
| **OAuth Secrets** | Azure AD client secret, Okta keys | SOPS-encrypted | 180 days |

## SOPS (Secrets OPerationS) Setup

### Installation & Configuration

```bash
# Install SOPS
curl -LO https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops

# Configure Azure Key Vault for SOPS
export AZURE_TENANT_ID="<tenant-id>"
export AZURE_CLIENT_ID="<client-id>"
export AZURE_CLIENT_SECRET="<client-secret>"

# Create .sops.yaml config
cat > .sops.yaml <<EOF
creation_rules:
  - path_regex: infrastructure/secrets/production/.*\.yaml$
    azure_keyvault: https://brainsait-kv-prod.vault.azure.net/keys/sops-key/latest
  - path_regex: infrastructure/secrets/staging/.*\.yaml$
    azure_keyvault: https://brainsait-kv-staging.vault.azure.net/keys/sops-key/latest
  - path_regex: infrastructure/secrets/dev/.*\.yaml$
    azure_keyvault: https://brainsait-kv-dev.vault.azure.net/keys/sops-key/latest
EOF
```

### Encrypting Secrets

```bash
# Create plaintext secret file (DO NOT COMMIT)
cat > mongodb-credentials.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
  namespace: brainsait-production
type: Opaque
stringData:
  username: admin
  password: SuperSecurePassword123!
  connectionString: mongodb://admin:SuperSecurePassword123!@mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/brainsait?replicaSet=rs0&authSource=admin
EOF

# Encrypt with SOPS
sops --encrypt mongodb-credentials.yaml > infrastructure/secrets/production/mongodb-credentials.enc.yaml

# Commit encrypted file safely
git add infrastructure/secrets/production/mongodb-credentials.enc.yaml
git commit -m "chore: add encrypted MongoDB production credentials"
git push
```

### Decrypting Secrets (CI/CD Pipeline)

```yaml
# .github/workflows/deploy.yml
- name: Decrypt secrets with SOPS
  env:
    AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  run: |
    sops --decrypt infrastructure/secrets/production/mongodb-credentials.enc.yaml | \
      kubectl apply -f -
```

## Sealed Secrets Setup

### Controller Installation

```bash
# Install Sealed Secrets controller in cluster
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-linux-amd64
sudo install -m 755 kubeseal-linux-amd64 /usr/local/bin/kubeseal

# Fetch public key for sealing
kubeseal --fetch-cert --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system > pub-sealed-secrets.pem
```

### Creating Sealed Secrets

```bash
# Create secret locally
kubectl create secret generic payer-api-keys \
  --from-literal=payer-a-key=abc123xyz \
  --from-literal=payer-b-key=def456uvw \
  --dry-run=client -o yaml > payer-api-keys-secret.yaml

# Seal it with public key (safe to commit)
kubeseal --format=yaml --cert=pub-sealed-secrets.pem \
  < payer-api-keys-secret.yaml > payer-api-keys-sealed.yaml

# Commit sealed secret
git add infrastructure/secrets/production/payer-api-keys-sealed.yaml
git commit -m "chore: add sealed payer API keys"
git push

# Controller auto-decrypts when applied to cluster
kubectl apply -f infrastructure/secrets/production/payer-api-keys-sealed.yaml
```

## HashiCorp Vault Integration

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (brainsait-production)                │
│                                                            │
│  ┌─────────────┐         ┌─────────────────────────┐    │
│  │   Pod: API  │────────▶│  Vault Agent Sidecar    │    │
│  │   Service   │         │  (Injects secrets)      │    │
│  └─────────────┘         └─────────────────────────┘    │
│         ▲                           │                     │
│         │                           ▼                     │
│         │                  ┌─────────────────┐          │
│         └──────────────────│  K8s Auth       │          │
│                            │  ServiceAccount │          │
│                            └─────────────────┘          │
└──────────────────────────────────────────────────────────┘
                                   │
                                   │ TLS + K8s Auth Token
                                   ▼
┌──────────────────────────────────────────────────────────┐
│  HashiCorp Vault (Managed Service or Self-Hosted)        │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  KV Secrets Engine: /secret/brainsait/production/  │ │
│  │  - Database credentials                            │ │
│  │  - API keys                                        │ │
│  │  - Service tokens                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Database Secrets Engine: /database/mongodb/       │ │
│  │  - Dynamic credential generation                   │ │
│  │  - Automatic rotation                              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Transit Engine: /transit/brainsait/               │ │
│  │  - Encryption as a service                         │ │
│  │  - JWT signing                                     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Kubernetes Auth Setup

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Vault to talk to K8s API
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create policy for claims-scrubbing service
vault policy write claims-scrubbing-policy - <<EOF
path "secret/data/brainsait/production/claims-scrubbing/*" {
  capabilities = ["read"]
}
path "database/creds/mongodb-claims-scrubbing-role" {
  capabilities = ["read"]
}
path "transit/decrypt/brainsait" {
  capabilities = ["update"]
}
EOF

# Bind policy to K8s service account
vault write auth/kubernetes/role/claims-scrubbing \
  bound_service_account_names=claims-scrubbing-api \
  bound_service_account_namespaces=brainsait-production \
  policies=claims-scrubbing-policy \
  ttl=24h
```

### Vault Agent Sidecar Injection

```yaml
# Deployment with Vault Agent sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claims-scrubbing-api
  namespace: brainsait-production
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "claims-scrubbing"
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/mongodb-claims-scrubbing-role"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/mongodb-claims-scrubbing-role" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          {{- end }}
    spec:
      serviceAccountName: claims-scrubbing-api
      containers:
      - name: api
        image: brainsait/claims-scrubbing:v1.0.0
        command:
          - /bin/sh
          - -c
        args:
          - source /vault/secrets/db-creds && python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Dynamic Database Credentials

```bash
# Enable database secrets engine
vault secrets enable database

# Configure MongoDB connection
vault write database/config/mongodb \
  plugin_name=mongodb-database-plugin \
  allowed_roles="claims-scrubbing-role,fhir-gateway-role" \
  connection_url="mongodb://{{username}}:{{password}}@mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/admin?replicaSet=rs0" \
  username="vault-admin" \
  password="VaultAdminPassword!"

# Create role with limited permissions
vault write database/roles/claims-scrubbing-role \
  db_name=mongodb \
  creation_statements='{"db":"brainsait","roles":[{"role":"readWrite","db":"brainsait"}]}' \
  default_ttl="1h" \
  max_ttl="24h"

# Service automatically gets fresh credentials every hour
```

## Azure Key Vault Integration

### CSI Driver Setup

```yaml
# Install Azure Key Vault CSI driver
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secrets-store-csi-driver
  namespace: kube-system
---
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-sync
  namespace: brainsait-production
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "brainsait-kv-prod"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: mongodb-root-password
          objectType: secret
          objectVersion: ""
        - |
          objectName: jwt-signing-key
          objectType: secret
          objectVersion: ""
    tenantId: "<azure-tenant-id>"
  secretObjects:
  - secretName: azure-keyvault-secrets
    type: Opaque
    data:
    - objectName: mongodb-root-password
      key: mongodb-password
    - objectName: jwt-signing-key
      key: jwt-key
```

### Pod Mounting Secrets

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fhir-gateway-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: brainsait/fhir-gateway:v1.0.0
        volumeMounts:
        - name: secrets-store-inline
          mountPath: "/mnt/secrets"
          readOnly: true
        env:
        - name: JWT_SIGNING_KEY
          valueFrom:
            secretKeyRef:
              name: azure-keyvault-secrets
              key: jwt-key
      volumes:
      - name: secrets-store-inline
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "azure-keyvault-sync"
```

## Secret Rotation Strategy

### Automated Rotation Schedule

| Secret Type | Rotation Frequency | Automation | Downtime |
|-------------|-------------------|------------|----------|
| Database passwords | 90 days | Vault dynamic secrets | Zero (rolling) |
| API keys (external) | 180 days | Manual + calendar alert | Coordinated maintenance |
| TLS certs | 90 days | cert-manager automation | Zero (rolling) |
| JWT signing keys | 365 days | Manual | Zero (dual-key overlap) |
| Service account tokens | 90 days | K8s automatic | Zero |

### Rotation Procedure (Database)

```bash
# 1. Vault generates new credentials automatically every 1 hour
# 2. Pods fetch new creds on next Vault agent refresh
# 3. Old credentials remain valid for grace period (5 minutes)
# 4. Connection pool refreshes with new creds
# No manual intervention required!
```

### Rotation Procedure (API Keys - Manual)

```bash
# 1. Generate new key in external system (e.g., NPHIES portal)
NEW_KEY="new-api-key-xyz789"

# 2. Add new key to Vault (dual-key period)
vault kv put secret/brainsait/production/nphies-api \
  primary_key=$NEW_KEY \
  secondary_key=$OLD_KEY

# 3. Deploy code that tries primary, falls back to secondary
# 4. Monitor for 24 hours
# 5. Remove old key after verification
vault kv patch secret/brainsait/production/nphies-api \
  secondary_key=""
```

## Access Control & Auditing

### Principle of Least Privilege

```bash
# Service-specific policies (no broad access)
vault policy write claims-scrubbing-policy - <<EOF
# Can only read own secrets
path "secret/data/brainsait/production/claims-scrubbing/*" {
  capabilities = ["read"]
}
# Can get DB creds for own role only
path "database/creds/claims-scrubbing-role" {
  capabilities = ["read"]
}
# Cannot list, delete, or access other services' secrets
EOF
```

### Audit Logging

```bash
# Enable Vault audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Stream to SIEM
vault audit enable syslog \
  tag="vault" \
  facility="AUTH"

# Log every secret access
# - Who accessed what secret
# - When (timestamp)
# - From which pod/IP
# - Success/failure
```

### RBAC for Secret Management

| Role | Vault Permissions | K8s Permissions | Use Case |
|------|-------------------|-----------------|----------|
| **Platform Admin** | Root token (break-glass) | cluster-admin | Emergency only |
| **DevOps Engineer** | Read/write all secrets | edit in all namespaces | Day-to-day ops |
| **Developer** | Read dev secrets only | view in dev namespace | Local testing |
| **CI/CD Pipeline** | Read all, write none | create/update deployments | Automated deploys |
| **Service Account** | Read own secrets only | none (in-pod only) | Runtime access |

## Compliance & Security

### Encryption at Rest

- **Git Repository:** SOPS-encrypted with Azure Key Vault keys
- **Vault Storage:** AES-256-GCM encryption
- **K8s etcd:** Encryption at rest enabled with KMS provider
- **Backups:** Encrypted with customer-managed keys

### Encryption in Transit

- **Vault API:** TLS 1.3 only, mutual TLS for service-to-service
- **K8s Secrets:** Transmitted via TLS to kubelet
- **Service Mesh:** Istio/Linkerd enforces mTLS between all pods

### Secret Expiry & Cleanup

```bash
# Automated cleanup of expired secrets (cron job)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-cleanup
  namespace: brainsait-system
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Delete secrets older than 90 days with cleanup annotation
              kubectl get secrets --all-namespaces -o json | \
              jq -r '.items[] | select(.metadata.annotations["brainsait.com/cleanup"]=="true") | 
                select((.metadata.creationTimestamp | fromdateiso8601) < (now - 7776000)) | 
                "\(.metadata.namespace) \(.metadata.name)"' | \
              while read ns name; do
                kubectl delete secret -n $ns $name
              done
          restartPolicy: OnFailure
```

## Disaster Recovery

### Backup Strategy

```bash
# Daily automated backups of Vault data
vault operator raft snapshot save /backups/vault-snapshot-$(date +%Y%m%d).snap

# Upload to KSA-compliant storage
az storage blob upload \
  --account-name brainsaitdrbackups \
  --container-name vault-snapshots \
  --name vault-snapshot-$(date +%Y%m%d).snap \
  --file /backups/vault-snapshot-$(date +%Y%m%d).snap

# Retention: 90 days
```

### Restore Procedure

```bash
# 1. Restore Vault from snapshot
vault operator raft snapshot restore /backups/vault-snapshot-20251001.snap

# 2. Unseal Vault with recovery keys
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>

# 3. Verify secrets accessible
vault kv get secret/brainsait/production/mongodb

# 4. Restart pods to refresh secret mounts
kubectl rollout restart deployment -n brainsait-production
```

## Developer Workflow

### Local Development

```bash
# 1. Copy .env.example to .env (git-ignored)
cp .env.example .env

# 2. Fill in development secrets (never production!)
cat > .env <<EOF
DB_CONNECTION_STRING=mongodb://localhost:27017/brainsait
JWT_SECRET=local-dev-secret-change-me
NPHIES_API_KEY=sandbox-test-key
EOF

# 3. Docker Compose uses .env automatically
docker-compose up -d
```

### Accessing Staging Secrets (Approved Devs)

```bash
# 1. Authenticate to Vault
vault login -method=oidc

# 2. Read staging secrets
vault kv get secret/brainsait/staging/mongodb

# 3. Export to .env for local testing
vault kv get -format=json secret/brainsait/staging/mongodb | \
  jq -r '.data.data | to_entries | .[] | "\(.key)=\(.value)"' > .env.staging
```

## Next Steps

1. Provision Azure Key Vault / HashiCorp Vault in KSA region
2. Install Sealed Secrets controller and SOPS in CI/CD
3. Migrate existing secrets from current storage to Vault
4. Implement automated rotation for database credentials
5. Set up audit logging and alerting for secret access
6. Train team on secret management workflows
