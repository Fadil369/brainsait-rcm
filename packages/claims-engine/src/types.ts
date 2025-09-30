/**
 * BrainSAIT Claims Engine Types
 */

export interface Claim {
  id: string;
  patient_id: string;
  provider_id: string;
  physician_id?: string;
  service_date: string;
  submission_date: string;
  billed_amount: MoneyAmount;
  diagnosis_codes: string[];
  procedure_codes: string[];
  status: ClaimStatus;
  nphies_reference?: string;
}

export interface MoneyAmount {
  net: number;
  vat: number;
  total: number;
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  REJECTED = 'REJECTED',
  APPEALED = 'APPEALED'
}

export interface ClaimProcessingRule {
  id: string;
  name: string;
  description: string;
  condition: (claim: Claim) => boolean;
  action: (claim: Claim) => ProcessingAction;
  priority: number;
}

export interface ProcessingAction {
  type: 'APPROVE' | 'REJECT' | 'REVIEW' | 'FLAG';
  reason?: string;
  modifications?: Partial<Claim>;
}

export interface ClaimBatch {
  id: string;
  claims: Claim[];
  submittedAt: Date;
  processedAt?: Date;
  totalAmount: MoneyAmount;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}