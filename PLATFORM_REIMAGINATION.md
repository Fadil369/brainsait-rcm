# BrainSAIT RCM Platform — Reimagined Blueprint

**Date:** 5 October 2025  
**Document Owner:** BrainSAIT Transformation Office  
**Reference Inputs:** `PRD.md`, `SECURITY_AUDIT_REPORT.md`, `CODE_QUALITY_REPORT.md`, `IMMEDIATE_ACTION_PLAN.md`, Cloudflare deployment artefacts, mobile UI prototypes (`claim-oaises*.html`)

---

## 1. North Star Vision

BrainSAIT evolves into the **Aligned Care Network**: a unified, HIPAA- and NPHIES-compliant operating layer that links Provider, Payer, and Regulator workflows across Saudi Arabia. The platform maximises **first-pass clean claim rate (FPCCR)**, minimises denial rework, and surfaces AI-driven insights to every stakeholder within their Zero Trust boundaries.

---

## 2. Target Experiences

### 2.1 Personas and Journeys

- **HeadQ RCM Strategist:** Needs end-to-end adjudication visibility, AI-powered denial clustering, and continuous KPI tracking. Operates within the Denial Command Center.
- **Branch RCM Validator (Unaizah, Madinah, Khamis, Jazan):** Requires a guided 48-hour SLA workspace with contextual justifications, NLP vetting, and automated escalations.
- **Provider Claims Staff:** Submits pre-scrubbed claims through the Claims Oasis module with real-time Denial Risk Scores, eligibility checks, and doc capture.
- **Regulatory Oversight (NPHIES/CHI):** Accesses immutable audit flows, compliance dashboards, and receives secure event streams from the system of record.

### 2.2 Experience Principles

1. **Zero-friction compliance:** Enforce HL7 FHIR R4 minimum data sets and NPHIES mappings at input time to prevent downstream denials.
2. **Predict, then prescribe:** Every submission, denial, or reassignment is accompanied by AI- or NLP-backed recommendations.
3. **Context-aware collaboration:** Branch views only see what they own (Cloudflare Zero Trust policies) with SLA timers and skill-based routing baked in.
4. **Observable by design:** Each action generates audit logs, metrics, and traces consumable by leadership and auditors.

---

## 3. Platform Architecture

### 3.1 High-Level Layers

- **Experience Layer:** Next.js 14 application, NativeScript/React Native mobile apps, and Cloudflare Workers front-ends with offline-first task queues for branches.
- **Edge Security Layer:** Cloudflare Zero Trust Access, DDoS mitigation, WAF, mutual TLS to partner APIs, and rate limiting for all external touchpoints.
- **Orchestration & API Layer:** FastAPI gateway exposed via Cloudflare, connecting to microservices for claims ingestion, FHIR translation, AI scoring, audit logging, and notification delivery.
- **Data & Intelligence Layer:**

  - **Operational datastore:** MongoDB Atlas (KSA region) with sharded collections by branch and payer; encrypted at rest via customer managed keys.
  - **Analytical lakehouse:** Delta Lake on Azure Data Lake Storage Gen2 (KSA) or AWS equivalent depending on localisation mandates, ingesting claim and denial events through streaming pipelines.
  - **Model registry:** MLflow or Vertex AI Model Registry clone hosted in-region to version predictive and NLP models.

- **Integration Layer:**

  - NPHIES FHIR R4 Gateway with validation service and conformance testing harness.
  - Payer connectors orchestrated via async workers and Cloudflare Durable Objects to maintain idempotency and retries.
  - Document AI services (OCR + NLP) using in-region providers or self-hosted models to satisfy PHI localisation.

### 3.2 Key Technical Decisions

| Capability | Reimagined Approach | Rationale |
| --- | --- | --- |
| **Claims Scrubbing** | Stream-validated via Python `pydantic` models and a rules engine (Open Policy Agent or Drools) | Guarantees compliance with NPHIES Minimum Data Set before hitting external APIs |
| **Denial Risk Score** | Gradient boosted models hosted as REST microservices, with async inference pipelines and feature store aligned to payer schemas | Supports real-time scoring with explainability (SHAP) |
| **Document Capture** | Self-hosted Tesseract + healthcare-tuned NLP models (spaCy, Arabic transformer variants) with human-in-the-loop validation | Ensures PHI remains within KSA and surfaces missing fields |
| **Skill Routing** | Reinforcement learning bandit model drawing on success history and branch capacity metrics | Balances SLA compliance and success probability |
| **Audit Trail** | Append-only event ledger using Kafka + immutable storage (Object store with WORM policies) | Meets TECH-1.4 audit mandate |

### 3.3 Deployment Blueprint

1. **Edge:** Cloudflare Workers/Pages host the Next.js statically optimised bundle; Cloudflare Access enforces branch-level segmentation.
2. **API:** FastAPI microservices containerised with Docker, deployed on Kubernetes (AKS in KSA region) or ECS/Fargate depending on chosen cloud. Each service validates schema via JSON Schema + Pydantic V2.
3. **Async Workloads:** Cloudflare Queues or Kafka for claim ingestion, denial retrieval, and NLP jobs. Dedicated worker pods process tasks with Visibility Timeout and dead-letter queues.
4. **Observability:** OpenTelemetry instrumentation, Prometheus metrics, Grafana dashboards aligned to KPIs (FPCCR, DRR, Appeal Cycle Time).
5. **Security:** Secrets managed by HashiCorp Vault or cloud-native secret manager; SOPS for GitOps. All PHI encrypted end-to-end.

---

## 4. AI & Analytics Fabric

### 4.1 Model Portfolio

- **Predictive Denial Model:** Binary classification with probability output; features include payer, CPT/ICD pairs, eligibility state, documentation metadata. Deployed with A/B testing harness.
- **NLP Root Cause Mapper:** Transformer model fine-tuned on NPHIES denial codes for mapping to HNH root causes; outputs structured taxonomy + confidence.
- **Skill-Based Assignment Engine:** Contextual multi-armed bandit recommending branch validator with highest uplift.
- **NLP Justification Vetting:** Sequence classifier verifying presence of mandatory clinical keywords; integrated into branch submission flow.

### 4.2 Data Activation

- **Feature Store:** Centralised repository (Feast or Tecton) storing pre-computed features accessible by both batch and online services.
- **Process Mining Layer:** Event logs ingested into Celonis or open-source PM4Py to visualise claim lifecycle and detect bottlenecks.
- **KPI Dashboards:** Executive dashboards built with Apache Superset or Looker, powered by the analytical lakehouse, tracking FPCCR, DRR, and appeal cycle times with drill-downs.

---

## 5. Compliance, Security, and Governance

- **Data Localisation:** All databases, object storage, and AI workloads confined to KSA-approved regions. Validate providers against national regulations.
- **Zero Trust Policies:** Cloudflare Access groups tied to identity provider (Azure AD or Okta) roles; branch staff only see claims assigned to their geography.
- **API Rate Limiting:** Enforce per-client quotas at Cloudflare and API gateway; log all external interactions with immutable timestamps.
- **Immutable Audit Trails:** Kafka topics with schema registry, mirrored to WORM storage, accessible to auditors via pre-built queries.
- **Access Governance:** RBAC and ABAC across services; periodic access reviews; documentation approved by compliance office.

---

## 6. Product Modules Blueprint

### 6.1 Claims Oasis (Submission)

- Real-time data validation, predictive denial risk scoring, and auto-coding suggestions.
- Document AI pipeline with OCR/NLP cross-validation against claim fields.
- Eligibility verification integrated with NPHIES Eligibility API, with automated alerting when service dates fall outside coverage.

### 6.2 Denial Command Center

- Automated ingestion of ClaimResponse messages with NLP-driven root cause mapping.
- Executive process mining dashboards to visualise claim lifecycle deviations.
- Skill-based reassignment engine recommending optimal branch actors.

### 6.3 Branch Collaboration Engine

- Personalised task queues with SLA countdown timers and escalation notifications at 75% threshold.
- Contextual justification forms generated from root cause taxonomy.
- NLP vetting of branch responses before HeadQ review.

---

## 7. Build Roadmap (0–18 Months)

### 7.1 Phase 0 — Foundation (0–3 Months)

- Harden security posture per `IMMEDIATE_ACTION_PLAN.md` (dependency updates, rate limiting, indexes).
- Stand up Cloudflare Zero Trust pilot with role-based segmentation.
- Establish data localisation compliant infrastructure (select cloud provider, configure Kubernetes/containers, secrets management).
- Define canonical FHIR profiles and payload schemas; implement conformance testing harness.

### 7.2 Phase 1 — Intelligent Submission (3–9 Months)

- Ship Claims Oasis MVP with AI-powered scrubbing, OCR ingestion, and eligibility checks.
- Implement Denial Risk scoring service (baseline logistic regression, iterate to gradient boosting).
- Build event-driven audit pipeline and integrate with analytics lakehouse.
- Deploy mobile-first interface for Provider staff using Tailwind prototypes as baseline.

### 7.3 Phase 2 — Denial Command Center (9–14 Months)

- Automate denial ingestion and NLP root cause mapping.
- Launch executive dashboards with KPI drill-down and process mining insights.
- Introduce skill-based reassignment and branch capacity management.

### 7.4 Phase 3 — Branch Collaboration Engine (14–18 Months)

- Release SLA-driven branch workspace with NLP justification vetting.
- Implement automated escalations and multi-channel alerts (WhatsApp, email, in-app).
- Conduct UAT with all branches, gather feedback, and iterate for localisation nuances.

---

## 8. Success Metrics & Telemetry Strategy

- **FPCCR > 90%:** Track per payer and per branch; alert when rolling 14-day average dips below threshold.
- **DRR > 95%:** Monitor success rate of reopened claims; tie improvements to skill routing experiments.
- **Appeal Cycle Time < 48 Hours:** Measure SLA adherence at branch level; escalate automatically at 75% time elapsed.
- **AI Quality:** Maintain calibration curves and drift monitoring; require human review when confidence < 0.7.
- **Operational Resilience:** MTTR < 30 minutes, error budget compliance, chaos testing twice per quarter.

Telemetry instrumentation aligns with OpenTelemetry; dashboards surfaced via Grafana/Looker; alerting integrated with PagerDuty and compliance reporting.

---

## 9. Operating Model & Governance

- **Product Council:** Meets bi-weekly to prioritise backlog aligned with PRD mandates and compliance needs.
- **ML Ethics Board:** Reviews model performance, bias assessments, and drift reports monthly.
- **Change Management:** All deployment changes via GitOps pipelines, with automated policy checks (OPA) ensuring configuration parity across environments.
- **Training & Enablement:** Structured learning paths for HeadQ and branch staff covering new workflows, AI explainability, and compliance obligations.

---

## 10. Open Questions

- Final decision on cloud provider within KSA (Azure vs AWS vs STC Cloud) and impact on managed ML tooling availability.
- Regulatory clarity on cross-border backups; confirm whether encrypted DR copies outside KSA are permissible.
- Integration roadmap for legacy hospital information systems; determine data synchronisation and reconciliation strategy.
- Scope of patient-facing capabilities (portal access, notification preferences) in initial MVP.

---

**Next Action:** Present this blueprint to executive stakeholders for validation, then translate into epics and OKRs for Q4 2025 and Q1 2026.
