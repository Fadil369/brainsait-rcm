/**
 * Shared TypeScript types for BrainSAIT RCM platform
 */
import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum ClaimStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DENIED = 'denied',
  APPEALED = 'appealed',
  PAID = 'paid'
}

// ============================================================================
// Zod Schemas (for runtime validation)
// ============================================================================

export const ClaimDocumentationSchema = z.object({
  physicianNotes: z.string().optional(),
  preAuthNumber: z.string().optional(),
  labResults: z.array(z.string()).optional(),
  imagingReports: z.array(z.string()).optional()
});

export const ClaimValidationRequestSchema = z.object({
  patientId: z.string().min(1),
  payerId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  icdCodes: z.array(z.string()).min(1),
  cptCodes: z.array(z.string()).min(1),
  totalAmount: z.number().positive(),
  providerId: z.string().min(1),
  documentation: ClaimDocumentationSchema.optional()
});

export const ValidationIssueSchema = z.object({
  severity: z.nativeEnum(IssueSeverity),
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  suggestion: z.string().optional()
});

export const ComplianceStatusSchema = z.object({
  nphiesMds: z.enum(['pass', 'fail', 'warning']),
  payerRules: z.enum(['pass', 'fail', 'warning']),
  eligibility: z.enum(['pass', 'fail', 'warning'])
});

export const AutoCodingSuggestionSchema = z.object({
  suggestedIcd: z.array(z.string()),
  suggestedCpt: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional()
});

export const ClaimValidationResponseSchema = z.object({
  validationId: z.string(),
  status: z.enum(['pass', 'warning', 'error']),
  denialRiskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  compliance: ComplianceStatusSchema,
  issues: z.array(ValidationIssueSchema),
  recommendations: z.array(z.object({
    type: z.string(),
    message: z.string(),
    priority: z.number().optional()
  })),
  autoCoding: AutoCodingSuggestionSchema.optional()
});

// ============================================================================
// TypeScript Interfaces (inferred from Zod schemas)
// ============================================================================

export type ClaimDocumentation = z.infer<typeof ClaimDocumentationSchema>;
export type ClaimValidationRequest = z.infer<typeof ClaimValidationRequestSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type AutoCodingSuggestion = z.infer<typeof AutoCodingSuggestionSchema>;
export type ClaimValidationResponse = z.infer<typeof ClaimValidationResponseSchema>;

// ============================================================================
// Additional Types
// ============================================================================

export interface Claim {
  id: string;
  patientId: string;
  patientName: string;
  payerId: string;
  payerName: string;
  providerId: string;
  serviceDate: string;
  totalAmount: number;
  status: ClaimStatus;
  denialRiskScore?: number;
  riskLevel?: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface DenialRecord {
  id: string;
  claimId: string;
  denialCode: string;
  denialReason: string;
  deniedAmount: number;
  deniedAt: string;
  assignedTo?: string;
  rootCause?: string;
  status: 'pending' | 'in-progress' | 'appealed' | 'resolved';
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  staff: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'analyst';
  branchId?: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
