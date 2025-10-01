// Cloudflare Worker Environment Bindings
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  AUDIT_LOGS_KV: KVNamespace;

  // R2 Buckets
  DOCUMENTS: R2Bucket;
  BACKUPS: R2Bucket;

  // Environment Variables
  ENVIRONMENT: string;
  JWT_ALGORITHM: string;
  ACCESS_TOKEN_EXPIRE_MINUTES: string;
  REFRESH_TOKEN_EXPIRE_DAYS: string;

  // Secrets
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  NPHIES_API_KEY?: string;
  NPHIES_API_URL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
}

// User roles
export type UserRole = 'ADMIN' | 'MANAGER' | 'PHYSICIAN' | 'BILLING_STAFF' | 'VIEWER';

// User interface
export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  department?: string;
  branch?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Rejection status
export type RejectionStatus = 'PENDING_REVIEW' | 'UNDER_APPEAL' | 'RECOVERED' | 'FINAL_REJECTION' | 'PARTIAL_RECOVERY';

// Reception mode
export type ReceptionMode = 'NPHIES' | 'PORTAL' | 'EMAIL';

// Rejection record
export interface Rejection {
  id: string;
  claim_id: string;
  patient_id: string;
  patient_name: string;
  tpa_name: string;
  insurance_company: string;
  policy_number?: string;

  // Financial amounts (stored as integers in halalas/cents)
  billed_amount_net: number;
  billed_amount_vat: number;
  billed_amount_total: number;
  rejected_amount_net: number;
  rejected_amount_vat: number;
  rejected_amount_total: number;

  service_date: string;
  submission_date: string;
  rejection_date?: string;
  response_deadline?: string;

  status: RejectionStatus;
  rejection_reason: string;
  rejection_code?: string;
  physician_name?: string;
  specialty?: string;

  is_within_30_days: number;
  days_until_deadline?: number;

  nphies_reference?: string;
  reception_mode?: ReceptionMode;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Appeal status
export type AppealStatus = 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PARTIAL_APPROVAL';

// Appeal record
export interface Appeal {
  id: string;
  rejection_id: string;
  appeal_number: string;
  appeal_reason: string;
  supporting_documents?: string;
  submission_method?: 'NPHIES' | 'PORTAL' | 'EMAIL' | 'FAX';
  submission_date: string;
  response_date?: string;
  status: AppealStatus;
  recovered_amount_net: number;
  recovered_amount_vat: number;
  recovered_amount_total: number;
  response_notes?: string;
  response_reference?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Compliance letter
export type LetterType = 'INITIAL_NOTIFICATION' | 'WARNING_FINAL' | 'INFORMATION_REQUEST';
export type LetterStatus = 'DRAFT' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export interface ComplianceLetter {
  id: string;
  rejection_id: string;
  letter_type: LetterType;
  recipient_name: string;
  recipient_email: string;
  recipient_organization?: string;
  subject_en: string;
  subject_ar: string;
  body_en: string;
  body_ar: string;
  pdf_url?: string;
  pdf_key?: string;
  status: LetterStatus;
  sent_at?: string;
  delivered_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Audit log
export interface AuditLog {
  id: string;
  user_id: string;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: string;
  timestamp: string;
}

// Fraud detection
export type FraudStatus = 'FLAGGED' | 'UNDER_INVESTIGATION' | 'CLEARED' | 'CONFIRMED_FRAUD';

export interface FraudDetection {
  id: string;
  claim_id: string;
  risk_score: number;
  fraud_types?: string;
  anomaly_reasons?: string;
  detection_date: string;
  status?: FraudStatus;
  investigated_by?: string;
  investigation_notes?: string;
}

// JWT Payload
export interface JWTPayload {
  user_id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request context
export interface RequestContext {
  user?: User;
  ip_address?: string;
  user_agent?: string;
}
