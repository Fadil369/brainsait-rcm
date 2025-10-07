export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface DashboardMetrics {
  total_claims?: number;
  total_billed?: number;
  total_rejected?: number;
  rejection_rate?: number;
  recovery_rate?: number;
  overdue_letters?: number;
  within_30_days_compliance?: number;
  compliance_within_30?: number;
  [key: string]: number | undefined;
}

export interface DashboardMetricSeriesPoint {
  timestamp?: string;
  ts?: number;
  value?: number;
  [key: string]: unknown;
}

export interface DashboardMetricSeries {
  id?: string;
  metric?: string;
  label?: string;
  points?: DashboardMetricSeriesPoint[];
  values?: DashboardMetricSeriesPoint[];
  data?: DashboardMetricSeriesPoint[];
  [key: string]: unknown;
}

export type DashboardChartSeries =
  | DashboardMetricSeries[]
  | Record<string, DashboardMetricSeriesPoint[] | DashboardMetricSeries | null | undefined>
  | null;

export interface DashboardAccountSummary {
  id?: string;
  account_id?: string;
  name?: string;
  label?: string;
  code?: string;
  shortcode?: string;
  region?: string;
  location?: string;
  locale?: string;
  [key: string]: unknown;
}

export interface DashboardFraudAlert {
  id?: string;
  _id?: string | { $oid?: string };
  reference?: string;
  description?: string;
  details?: string;
  severity?: string;
  detected_at?: string;
  detectedAt?: string;
  created_at?: string;
  createdAt?: string;
  physician_name?: string;
  physician?: string;
  [key: string]: unknown;
}

export interface DashboardRejectionRecord {
  id?: string;
  claim_id?: string;
  claimId?: string;
  tpa_name?: string;
  tpaName?: string;
  insurance_company?: string;
  insuranceCompany?: string;
  branch?: string;
  reception_mode?: string;
  receptionMode?: string;
  billed_amount?: { net?: number; vat?: number; total?: number };
  billedAmount?: { net?: number; vat?: number; total?: number };
  rejected_amount?: { total?: number };
  rejectedAmount?: { total?: number };
  rejection_received_date?: string;
  rejectionReceivedDate?: string;
  within_30_days?: boolean;
  within30Days?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface DashboardComplianceLetter {
  id?: string;
  recipient?: string;
  subject?: { en: string; ar: string } | string;
  due_date?: string;
  dueDate?: string;
  days_overdue?: number;
  daysOverdue?: number;
  total_amount?: number;
  totalAmount?: number;
  claim_references?: string[];
  claimReferences?: string[];
  [key: string]: unknown;
}

export interface DashboardAnalytics {
  metrics?: DashboardMetrics | null;
  accounts?: DashboardAccountSummary[] | null;
  recent_alerts?: DashboardFraudAlert[] | null;
  updated_at?: string | null;
  chart_series?: DashboardChartSeries;
  chartSeries?: DashboardChartSeries;
  [key: string]: unknown;
}

export interface DashboardDataPayload {
  rejections: DashboardRejectionRecord[];
  letters: DashboardComplianceLetter[];
  analytics: DashboardAnalytics | null;
}

export interface TrendMetrics {
  count?: number;
  rejected_amount?: number;
  rejectedAmount?: number;
  recovered_count?: number;
  recoveredCount?: number;
  [key: string]: number | undefined;
}

export interface TrendsResponse {
  daily_trends?: Record<string, TrendMetrics | null | undefined>;
  summary?: Record<string, unknown> | null;
  updated_at?: string;
  [key: string]: unknown;
}

export interface FraudDetectionInput {
  claim_id: string;
  provider_id?: string;
  patient_id?: string;
  billed_amount?: number;
  service_date?: string;
  procedure_codes?: string[];
  diagnosis_codes?: string[];
  [key: string]: unknown;
}

export interface FraudDetectionClaim {
  claim_id?: string;
  provider_id?: string;
  patient_id?: string;
  risk_score?: number;
  fraud_types?: string[];
  details?: string;
  [key: string]: unknown;
}

export interface FraudDetectionResult {
  total_analyzed?: number;
  suspicious_count?: number;
  fraud_rate?: number;
  suspicious_claims?: FraudDetectionClaim[];
  recommendations?: string[];
  [key: string]: unknown;
}

export interface PredictiveHistoricalPoint {
  date: string;
  rejection_rate?: number;
  claim_count?: number;
  [key: string]: unknown;
}

export interface PredictiveForecastDay {
  date?: string;
  rejection_rate?: number;
  claim_count?: number;
  [key: string]: unknown;
}

export interface PredictiveAnalyticsResult {
  predicted_rejection_rate?: number;
  predicted_claim_volume?: number;
  predicted_recovery_rate?: number;
  trend?: string;
  forecast?: PredictiveForecastDay[];
  recommendations?: string[];
  [key: string]: unknown;
}

export interface AppealRecord {
  id?: string;
  status?: string;
  claim_id?: string;
  claimant?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type AppealRecordInput = Omit<AppealRecord, 'id'> & Record<string, unknown>;

export interface HealthStatus {
  status?: string;
  database?: string;
  services?: Record<string, string | number | boolean | null | undefined>;
  [key: string]: unknown;
}
