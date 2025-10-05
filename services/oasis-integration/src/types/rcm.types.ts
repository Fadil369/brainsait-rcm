/**
 * RCM Integration Types
 * Data models for transforming OASIS data to RCM format
 */

import { BilingualText } from './common.types';

// ============================================================================
// RCM Rejection Record (from packages/rejection-tracker/src/types.ts)
// ============================================================================

export interface RCMRejectionRecord {
  // Core identification
  id: string;
  claimNumber: string;
  rejectionId: string;

  // Patient information
  patientInfo: {
    nationalId: string;
    name: BilingualText;
    dateOfBirth: string;
    gender: 'M' | 'F';
    membershipNumber: string;
  };

  // Provider information
  providerInfo: {
    providerId: string;
    providerName: BilingualText;
    branch?: string;
    departmentId?: string;
  };

  // Payer information
  payerInfo: {
    payerCode: string;
    payerName: BilingualText;
    tpaName?: BilingualText;
  };

  // Rejection details
  rejectionDetails: {
    rejectionDate: string;
    rejectionCode: string;
    rejectionReason: BilingualText;
    rejectionDescription?: BilingualText;
    category: 'MEDICAL' | 'TECHNICAL' | 'ADMINISTRATIVE' | 'BILLING' | 'AUTHORIZATION';
    rejectionType: 'FULL' | 'PARTIAL' | 'ITEM';
  };

  // Financial impact
  financialImpact: {
    totalClaimed: {
      net: number;
      vat: number;
      total: number;
    };
    totalRejected: {
      net: number;
      vat: number;
      total: number;
    };
    totalApproved?: {
      net: number;
      vat: number;
      total: number;
    };
  };

  // Timeline tracking
  timeline: {
    claimSubmissionDate: string;
    encounterDate: string;
    rejectionReceivedDate: string;
    daysToRejection: number;
    daysUntilDeadline: number;
    appealDeadline: string;
  };

  // Status tracking
  status: 'PENDING_REVIEW' | 'UNDER_APPEAL' | 'RECOVERED' | 'FINAL_REJECTION';

  // Appeal information
  appeal?: {
    appealDate?: string;
    appealMethod?: 'NPHIES' | 'PORTAL' | 'EMAIL';
    appealStatus?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
    recoveredAmount?: {
      net: number;
      vat: number;
      total: number;
    };
    appealNotes?: string;
  };

  // Service details
  services: Array<{
    itemNumber: number;
    serviceCode: string;
    serviceDescription: BilingualText;
    quantity: number;
    unitPrice: number;
    totalAmount: {
      net: number;
      vat: number;
      total: number;
    };
    status: 'APPROVED' | 'REJECTED' | 'PENDING';
    rejectionCode?: string;
    rejectionReason?: BilingualText;
  }>;

  // Analysis data
  analysis: {
    rootCause?: string;
    preventable: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    correctiveActionRequired: boolean;
  };

  // Metadata
  metadata: {
    sourceSystem: 'OASIS' | 'NPHIES' | 'MANUAL';
    receptionMode: 'NPHIES' | 'PORTAL' | 'EMAIL';
    importedAt: string;
    importedBy: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
  };

  // FHIR compliance
  fhirClaimResponseId?: string;
}

// ============================================================================
// RCM Statistics
// ============================================================================

export interface RCMStatistics {
  period: {
    from: string;
    to: string;
  };

  overview: {
    totalRejections: number;
    totalRejectedAmount: number;
    totalRecoveredAmount: number;
    recoveryRate: number; // percentage
  };

  byCategory: Record<string, {
    count: number;
    amount: number;
    percentage: number;
  }>;

  byPayer: Record<string, {
    count: number;
    amount: number;
    percentage: number;
  }>;

  compliance: {
    within30Days: number;
    beyond30Days: number;
    complianceRate: number; // percentage
  };
}

// ============================================================================
// Sync Results
// ============================================================================

export interface OASISToRCMSyncResult {
  syncId: string;
  startTime: string;
  endTime: string;
  duration: number; // milliseconds

  source: {
    system: 'OASIS';
    dateRange: {
      from: string;
      to: string;
    };
  };

  results: {
    totalFetched: number;
    totalProcessed: number;
    totalImported: number;
    totalSkipped: number;
    totalErrors: number;
  };

  imported: {
    newRejections: number;
    updatedRejections: number;
    rejectionIds: string[];
  };

  skipped: Array<{
    claimNumber: string;
    reason: string;
  }>;

  errors: Array<{
    claimNumber?: string;
    error: string;
    details?: any;
  }>;

  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}
