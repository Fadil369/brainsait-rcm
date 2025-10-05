Product Requirements Document (PRD)
HNH-RCM Unified Claims Nexus Portal (Code Name: Aligned Care Network)
Section	Value
Product Vision	To be the premier AI-powered, NPHIES-compliant Revenue Cycle Management (RCM) platform in the Kingdom of Saudi Arabia, unifying all stakeholders (Provider, Payer, Government) to maximize first-pass claim acceptance and minimize denial rework across HNH's distributed network.
Target Users	HNH HeadQ RCM Analysts, Branch RCM Validators (Unaizah, Madinah, Khamis, Jazan), Provider Claims Staff, and Regulatory Oversight (NPHIES/CHI).
Technical Stack Mandate	Cloudflare Edge/Workers for performance and security; HL7 FHIR R4 for data exchange; NPHIES implementation guide adherence is non-negotiable.
Success Metrics (KPIs)	1. First-Pass Clean Claim Rate (FPCCR): Target >90%. 2. Denial Recovery Rate (DRR): Target >95%. 3. Average Denial Appeal Cycle Time: Target <48 hours.
1. Core Platform Architecture and Technical Requirements
This section mandates the infrastructure requirements to ensure security, scalability, and compliance.

ID	Requirement Name	Description	Priority
TECH-1.1	Cloudflare Zero Trust Access	Implement Cloudflare Access/Zero Trust policies to segment user access. Branch RCM staff (Unaizah, Madinah, etc.) shall only view and process claims explicitly routed to their location.	MUST
TECH-1.2	NPHIES FHIR R4 Gateway	The system must be built with a dedicated, validated API layer that transacts with all external entities (Payers, NPHIES) exclusively using the mandatory HL7 FHIR R4 standard as defined by the NPHIES Implementation Guide.	MUST
TECH-1.3	Secure Data Localization	All Protected Health Information (PHI) and claims data must be stored and processed on Cloud infrastructure localized within the Kingdom of Saudi Arabia to ensure national regulatory compliance.	MUST
TECH-1.4	API Rate Limiting & Audit	Utilize Cloudflare to apply strict rate limiting on external payer and NPHIES API calls, and maintain a complete, immutable audit log of every request and response.	MUST
2. Claims Oasis Module (Intelligent Submission)
This module is designed for denial prevention through AI-powered pre-submission validation.

ID	Requirement Name	Functional Requirements (FRs)	AI/ML Mandate
CO-2.1	AI-Powered Claim Scrubbing	The system SHALL validate all claim elements (ICD/CPT codes, patient data, eligibility reference) against known payer rules before submission.	Predictive Denial Model (ML): Use historical claim data (approved/denied) to calculate and display a "Denial Risk Score" (e.g., 0-100%) for the claim in real-time.
CO-2.2	Intelligent Document Capture (IDOC)	Allow staff to upload PDF/image documentation. The system SHALL use OCR and NLP to identify key fields (e.g., procedure date, physician signature, pre-auth number) and cross-validate against claim data.	NLP: Extract clinical justification snippets from unstructured physician notes and cross-reference against CPT codes for medical necessity screening.
CO-2.3	NPHIES Standard Mapping	The claims entry screen SHALL only accept data fields and formats conforming to the NPHIES Minimum Data Set (MDS) and FHIR profiles, automatically preventing non-compliant submissions.	Auto-Coding Suggestion: Provide real-time, context-aware ICD-10 and CPT code suggestions based on the reported diagnosis and procedure description.
CO-2.4	Real-Time Eligibility Check	Must integrate with the NPHIES Eligibility Use Case to verify patient insurance coverage and policy benefits prior to service and submission.	Automated Alerting: Flag claims where the service date falls outside the verified eligibility period.
3. Denial Command Center (HeadQ Intelligence & Analytics)
This module provides the central R&D capability for the HNH HeadQ team.

ID	Requirement Name	Functional Requirements (FRs)	AI/ML Mandate
DCC-3.1	Automated Denial Ingestion	The system SHALL automatically receive and log all Payer adjudication results and denial messages (ClaimResponse via NPHIES) into a centralized HeadQ queue.	NLP-Driven Root Cause Mapping: Automatically parse the Payer's NPHIES Denial Code and map it to an internal HNH Root Cause Category (e.g., Payer Code X → HNH Root Cause: "Clinical Documentation Gap - Physician A").
DCC-3.2	Executive Process Mining Dashboard	Provide a graphical dashboard for leadership displaying KPI performance (FPCCR, DRR). Enable filtering by Payer, Branch, Physician, and denial root cause.	Process Mining: Implement an analysis layer to visualize the complete end-to-end claim lifecycle flow and identify workflow bottlenecks or deviation points that contribute to denial.
DCC-3.3	Skill-Based Reassignment	The HeadQ analyst initiates the denial appeal workflow by assigning the task to a branch. The system SHALL recommend the optimal user for the task.	ML-Powered Skill Routing: Based on the claim's Denial Code and dollar value, recommend the RCM staff member (e.g., "Madinah Coding Specialist") with the highest historical success rate for appealing that specific type of denial.
4. Branch Collaboration Engine (Distributed Appeal Workflow)
This module ensures efficient and timely appeal rework across Unaizah, Madinah, Khamis, and Jazan.

ID	Requirement Name	Functional Requirements (FRs)	AI/ML Mandate
BCE-4.1	Time-Bound Task Queue	Each Branch staff member SHALL have a personalized dashboard showing only their assigned tasks. Each task MUST display a highly visible, counting-down 48-Hour SLA Timer (as per HNH policy).	Automated Escalation: If the timer reaches 75% without status update, the system SHALL auto-notify the Branch Manager and HeadQ Analyst.
BCE-4.2	Contextual Justification Input	When a Branch RCM Validator opens a claim, the interface SHALL dynamically present a structured form tailored to the HeadQ-assigned internal root cause.	NLP Vetting: Before submission back to HeadQ, the NLP engine SHALL review the uploaded justification text and supporting documents, flagging any missing mandatory clinical keywords or incomplete rationales.
BCE-4.3	Full Audit and Version Control	The system SHALL maintain a complete, immutable audit log of all changes and actions on a claim (e.g., "Analyst X in HeadQ routed on [Date/Time]," "Validator Y in Unaizah uploaded Document Z").	Automated Appeal Letter Draft: Upon HeadQ final validation, the system SHALL use the collected justification data to draft a professional, compliant Appeal/Re-submission Letter for final HeadQ review.
5. Security, Compliance, and Data Requirements
ID	Requirement Name	Description
SEC-5.1	User Role Definition	Must enforce Role-Based Access Control (RBAC) with defined roles (Provider Claims, Branch Validator, HeadQ Analyst, Admin, Leadership).
SEC-5.2	Data Masking	Implement data masking policies so that non-essential PHI (e.g., patient name) is masked for branch users who only require claim/denial details.
SEC-5.3	Compliance Update Feed	A dedicated section in the portal MUST display notifications related to new or updated NPHIES/CHI/SFDA regulations.
DATA-5.4	Data Standardization	All data fields must conform to NPHIES/CHI/KSA national standards (e.g., using official NPHIES code sets for services, denial reasons, and procedures).
