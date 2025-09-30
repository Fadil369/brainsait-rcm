/**
 * BRAINSAIT: HIPAA-compliant rejection tracking with Arabic support
 * MEDICAL: FHIR R4 Claim and ClaimResponse resources
 */

export interface RejectionRecord {
  id: string;
  tpaName: string;              // اسم شركة ادارة المطالبات
  insuranceCompany: string;      // اسم شركة التأمين
  branch: string;                // الفرع

  // Financial Data (Net + VAT)
  billedAmount: MoneyAmount;
  rejectedAmount: MoneyAmount;

  // Dates
  rejectionReceivedDate: Date;  // تاريخ استلام كشف المرفوضات
  resubmissionDate?: Date;       // تاريخ ارسال الاستئناف

  // Reception Method
  receptionMode: 'NPHIES' | 'PORTAL' | 'EMAIL';

  // Appeal Data
  appealedAmount?: MoneyAmount;
  recoveredAmount?: MoneyAmount;

  // Calculated Metrics
  initialRejectionRate: number;   // نسبة المرفوضات الاولية
  appealRate?: number;            // نسبة المبلغ المستأنف
  recoveryRate?: number;          // نسبة الاسترداد
  finalRejectionRate?: number;    // نسبة المرفوضات النهائية

  // Compliance
  within30Days: boolean;          // هل تم استلام الرد خلال 30 يوم
  status: RejectionStatus;

  // Audit
  createdBy: string;
  lastModifiedBy: string;
  auditLog: AuditEntry[];
}

export interface MoneyAmount {
  net: number;
  vat: number;
  total: number;
}

export enum RejectionStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  UNDER_APPEAL = 'UNDER_APPEAL',
  RECOVERED = 'RECOVERED',
  FINAL_REJECTION = 'FINAL_REJECTION',
  NON_APPEALABLE = 'NON_APPEALABLE'
}

export interface PhysicianRejectionAnalysis {
  physicianId: string;
  physicianName: string;
  speciality: string;
  totalRejections: number;
  totalRejectedValue: number;
  rejectionFrequency: number;
  fraudAlerts: FraudAlert[];
  correctionPlansRequired: boolean;
}

export interface FraudAlert {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'DUPLICATE' | 'UNBUNDLING' | 'UPCODING' | 'PHANTOM_BILLING';
  description: string;
  evidenceUrls: string[];
  reportedDate: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
}

export interface BilingualText {
  ar: string;
  en: string;
}

// Utility type for user roles
export type UserRole = 'ADMIN' | 'MANAGER' | 'ANALYST';

// Utility type for locales
export type Locale = 'ar' | 'en';