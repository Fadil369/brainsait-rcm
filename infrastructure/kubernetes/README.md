# Kubernetes Infrastructure for BrainSAIT RCM Platform

**Owner:** Platform Engineering Team  
**Last Updated:** October 5, 2025

## Overview

This directory contains all Kubernetes manifests for deploying the BrainSAIT RCM platform across environments. The architecture follows a microservices approach with namespace isolation, Zero Trust networking, and KSA data locality requirements.

## Cluster Architecture

### Namespaces

```yaml
brainsait-production      # Production workloads
brainsait-staging         # Staging environment
brainsait-dev             # Development environment
brainsait-system          # Platform services (monitoring, logging, mesh)
brainsait-data            # Data layer (MongoDB, Redis, Kafka)
```

### Compute Topology

- **Control Plane:** Managed Kubernetes (AKS/EKS in KSA region)
- **Node Pools:**
  - `system`: 3 nodes, Standard_D4s_v5, system workloads
  - `api`: 5-10 nodes (autoscaling), Standard_D8s_v5, FastAPI services
  - `workers`: 3-15 nodes (autoscaling), Standard_D4s_v5, async job processing
  - `data`: 3 nodes, Standard_E8s_v5 with premium SSD, stateful data services

### Networking Model

- **Service Mesh:** Istio or Linkerd for mTLS and observability
- **Ingress:** NGINX Ingress Controller behind Cloudflare
- **Network Policies:** Default deny-all, explicit allow rules per service
- **Load Balancing:** Internal Azure/AWS Load Balancer for service-to-service

### Storage Classes

```yaml
premium-ssd-retain:      # MongoDB, audit logs (retain on delete)
standard-ssd:            # Redis, ephemeral caches
azure-files-standard:    # Shared document storage (NFS)
```

## Service Catalog

### Core API Services

| Service | Namespace | Replicas | Resources | Autoscaling |
|---------|-----------|----------|-----------|-------------|
| `claims-scrubbing-api` | brainsait-production | 3 | 2 CPU, 4Gi RAM | 3-10, CPU 70% |
| `fhir-gateway-api` | brainsait-production | 3 | 2 CPU, 4Gi RAM | 3-8, CPU 70% |
| `audit-logger-api` | brainsait-production | 2 | 1 CPU, 2Gi RAM | 2-5, CPU 60% |
| `denial-command-api` | brainsait-production | 2 | 2 CPU, 4Gi RAM | 2-6, CPU 70% |
| `main-api-gateway` | brainsait-production | 3 | 2 CPU, 4Gi RAM | 3-10, CPU 70% |

### Async Workers

| Worker | Namespace | Replicas | Queue | Resources |
|--------|-----------|----------|-------|-----------|
| `claim-ingestion-worker` | brainsait-production | 5 | Kafka `claims-inbound` | 1 CPU, 2Gi RAM |
| `document-nlp-worker` | brainsait-production | 3 | Kafka `documents-uploaded` | 2 CPU, 4Gi RAM |
| `ml-inference-worker` | brainsait-production | 2 | Kafka `ml-scoring-requests` | 4 CPU, 8Gi RAM |
| `notification-worker` | brainsait-production | 2 | Kafka `notifications-outbound` | 1 CPU, 2Gi RAM |

### Data Layer

| Component | Namespace | Type | Storage | Backup Strategy |
|-----------|-----------|------|---------|-----------------|
| MongoDB Cluster | brainsait-data | StatefulSet (3 replicas) | 500Gi premium-ssd-retain | Daily snapshots to KSA blob storage |
| Redis Cache | brainsait-data | StatefulSet (3 replicas) | 50Gi standard-ssd | No backup (ephemeral) |
| Kafka Cluster | brainsait-data | StatefulSet (3 brokers) | 1Ti premium-ssd-retain | Replication factor 3 |

## Security & Compliance

### Pod Security Standards

- **Privileged:** None (baseline deny)
- **Restricted:** All workloads run as non-root with read-only root FS
- **SecurityContext:** Drop all capabilities, no privilege escalation

### Network Policies

```yaml
# Default deny ingress/egress
# Explicit allow:
- API services → MongoDB, Redis, Kafka
- Workers → MongoDB, Kafka
- Ingress Controller → API services only
- All services → audit-logger (egress for logging)
```

### Secrets Management

- **CSI Driver:** Azure Key Vault or AWS Secrets Manager
- **Rotation:** Automated 90-day rotation for DB credentials
- **Encryption:** All secrets encrypted at rest with customer-managed keys

## Observability

- **Metrics:** Prometheus scraping all `/metrics` endpoints
- **Logs:** Fluent Bit → Azure Monitor / CloudWatch
- **Traces:** OpenTelemetry Collector → Jaeger or Tempo
- **Dashboards:** Grafana with pre-built KPI dashboards

## Deployment Strategy

- **Rolling Updates:** MaxUnavailable=1, MaxSurge=1
- **Health Checks:** Liveness + Readiness probes on all pods
- **PodDisruptionBudgets:** MinAvailable=50% for API services
- **Canary Releases:** Flagger for gradual traffic shift (10%, 50%, 100%)

## Disaster Recovery

- **RTO:** 4 hours
- **RPO:** 1 hour (MongoDB continuous backup)
- **Multi-Region:** Passive standby cluster in alternate KSA region
- **Failover:** Manual promotion via GitOps commit

## GitOps Integration

All manifests deployed via ArgoCD:
- **Sync Policy:** Automated with self-heal
- **Prune:** Enabled
- **Validation:** Pre-sync hooks run OPA policy checks
- **Rollback:** Automated on health check failures

## Directory Structure

```
kubernetes/
├── base/                           # Base manifests (kustomize)
│   ├── namespaces/
│   ├── network-policies/
│   ├── storage-classes/
│   └── service-mesh/
├── services/                       # Microservices deployments
│   ├── claims-scrubbing/
│   ├── fhir-gateway/
│   ├── audit-logger/
│   └── ...
├── data/                           # Stateful data services
│   ├── mongodb/
│   ├── redis/
│   └── kafka/
├── workers/                        # Async worker deployments
│   └── ...
├── overlays/                       # Environment-specific configs
│   ├── dev/
│   ├── staging/
│   └── production/
└── monitoring/                     # Observability stack
    ├── prometheus/
    ├── grafana/
    └── jaeger/
```

## Quick Commands

```bash
# Apply base infrastructure
kubectl apply -k base/

# Deploy to staging
kubectl apply -k overlays/staging/

# Check service health
kubectl get pods -n brainsait-production

# View logs
kubectl logs -n brainsait-production -l app=claims-scrubbing-api --tail=100 -f

# Scale workers
kubectl scale deployment claim-ingestion-worker -n brainsait-production --replicas=10
```

## Next Steps

1. Provision AKS/EKS cluster in KSA region with required node pools
2. Install service mesh (Istio) and observability stack
3. Configure external-dns for automatic DNS management
4. Set up cert-manager for TLS certificate automation
5. Deploy initial service manifests via ArgoCD
