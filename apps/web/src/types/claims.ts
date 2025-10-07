/**
 * Claim Validation Types
 * Local type definitions for claims validation
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: IssueSeverity;
  code?: string;
  suggestion?: string;
}

export interface ClaimValidationRequest {
  claimId?: string;
  patientId?: string;
  providerId?: string;
  payerId?: string;
  serviceDate?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  icdCodes?: string[];
  cptCodes?: string[];
  amount?: number;
  totalAmount?: number;
  documentation?: {
    preAuthNumber?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ClaimValidationResponse {
  valid: boolean;
  denialRiskScore: number;
  riskLevel: RiskLevel;
  issues: ValidationIssue[];
  compliance: {
    nphiesCompliant: boolean;
    payerRulesCompliant: boolean;
  };
  recommendations?: string[];
}
