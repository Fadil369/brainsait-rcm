/**
 * OASIS+ Integration Types
 * Data models for OASIS+ system integration
 */

import { z } from 'zod';

// ============================================================================
// Authentication
// ============================================================================

export const OASISCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  baseUrl: z.string().url(),
});

export type OASISCredentials = z.infer<typeof OASISCredentialsSchema>;

export interface OASISSession {
  sessionId: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
  expiresAt: Date;
  authenticated: boolean;
}

// ============================================================================
// Claim Data Models (OASIS format)
// ============================================================================

export interface OASISClaim {
  claimNumber: string;
  membershipNumber: string;
  providerNumber: string;
  patientName: {
    first: string;
    last: string;
    middle?: string;
  };
  patientNationalId: string;
  dateOfBirth: string;
  gender: 'M' | 'F';

  // Claim details
  claimType: 'IP' | 'OP' | 'DENTAL' | 'OPTICAL';
  submissionDate: string;
  encounterDate: string;

  // Financial
  totalAmount: number;
  netAmount: number;
  vatAmount: number;
  approvedAmount?: number;

  // Status
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'UNDER_REVIEW';
  rejectionReason?: string;
  rejectionCode?: string;

  // Items
  items: OASISClaimItem[];
}

export interface OASISClaimItem {
  itemNumber: number;
  serviceCode: string;
  serviceDescription: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;

  // Status per item
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  rejectionReason?: string;
  rejectionCode?: string;
  approvedAmount?: number;
}

// ============================================================================
// Rejection Data Models (OASIS format)
// ============================================================================

export interface OASISRejection {
  claimNumber: string;
  rejectionId: string;
  rejectionDate: string;
  rejectionType: 'FULL' | 'PARTIAL' | 'ITEM';

  // Rejection details
  rejectionCode: string;
  rejectionReason: string;
  rejectionDescription?: string;
  category: 'MEDICAL' | 'TECHNICAL' | 'ADMINISTRATIVE' | 'BILLING' | 'AUTHORIZATION';

  // Financial impact
  rejectedAmount: {
    net: number;
    vat: number;
    total: number;
  };

  // Payer information
  payerName: string;
  payerCode: string;
  tpaName?: string;

  // Appeal information
  appealable: boolean;
  appealDeadline?: string;
  appealStatus?: 'NOT_APPEALED' | 'UNDER_APPEAL' | 'APPEAL_ACCEPTED' | 'APPEAL_REJECTED';

  // Item-level rejections (for partial rejections)
  rejectedItems?: Array<{
    itemNumber: number;
    serviceCode: string;
    rejectionCode: string;
    rejectionReason: string;
    amount: number;
  }>;
}

// ============================================================================
// Search & Filter
// ============================================================================

export interface OASISSearchCriteria {
  // Date range
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD

  // Filters
  claimNumber?: string;
  membershipNumber?: string;
  patientNationalId?: string;
  status?: OASISClaim['status'][];
  claimType?: OASISClaim['claimType'][];
  payerCode?: string;

  // Pagination
  page?: number;
  pageSize?: number;
}

export const OASISSearchCriteriaSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claimNumber: z.string().optional(),
  membershipNumber: z.string().optional(),
  patientNationalId: z.string().optional(),
  status: z.array(z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING', 'UNDER_REVIEW'])).optional(),
  claimType: z.array(z.enum(['IP', 'OP', 'DENTAL', 'OPTICAL'])).optional(),
  payerCode: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(1000).default(100),
});

export interface OASISSearchResult {
  claims: OASISClaim[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Sync Configuration
// ============================================================================

export interface OASISSyncConfig {
  enabled: boolean;
  syncInterval: number; // minutes

  // What to sync
  syncRejections: boolean;
  syncPending: boolean;
  syncApproved: boolean;

  // Date range for sync
  lookbackDays: number; // How many days back to sync

  // Notification
  notifyOnNewRejections: boolean;
  notificationEmail?: string;
}

export const OASISSyncConfigSchema = z.object({
  enabled: z.boolean(),
  syncInterval: z.number().int().min(1).max(1440),
  syncRejections: z.boolean(),
  syncPending: z.boolean(),
  syncApproved: z.boolean(),
  lookbackDays: z.number().int().min(1).max(365),
  notifyOnNewRejections: z.boolean(),
  notificationEmail: z.string().email().optional(),
});

// ============================================================================
// Integration Status
// ============================================================================

export interface OASISIntegrationStatus {
  connected: boolean;
  lastSyncTime?: Date;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'NEVER_RAN';
  lastSyncError?: string;

  statistics: {
    totalClaimsProcessed: number;
    totalRejectionsFound: number;
    lastBatchSize: number;
  };

  nextScheduledSync?: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export class OASISError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OASISError';
  }
}

export class OASISAuthenticationError extends OASISError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'OASISAuthenticationError';
  }
}

export class OASISNetworkError extends OASISError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'OASISNetworkError';
  }
}

export class OASISDataError extends OASISError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ERROR', details);
    this.name = 'OASISDataError';
  }
}
