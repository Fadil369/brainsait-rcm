/**
 * BrainSAIT API Client
 * Centralized API communication layer
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import type {
  AppealRecord,
  AppealRecordInput,
  AuthUser,
  DashboardAnalytics,
  DashboardComplianceLetter,
  DashboardRejectionRecord,
  FraudDetectionInput,
  FraudDetectionResult,
  HealthStatus,
  LoginResponse,
  PredictiveAnalyticsResult,
  PredictiveHistoricalPoint,
  TrendsResponse,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;

/**
 * API Client Configuration
 */
class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - attach auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearAuthToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('brainsait_auth_token');
  }

  /**
   * Clear authentication token
   */
  private clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('brainsait_auth_token');
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brainsait_auth_token', token);
    }
  }

  // ============ Authentication Endpoints ============

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post('/api/auth/login', { email, password });
    if (response.data.access_token) {
      this.setAuthToken(response.data.access_token);
    }
    return response.data as LoginResponse;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearAuthToken();
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response = await this.client.get('/api/auth/me');
    return response.data as AuthUser;
  }

  // ============ Rejections Endpoints ============

  async getCurrentMonthRejections(): Promise<DashboardRejectionRecord[]> {
    const response = await this.client.get('/api/rejections/current-month');
    return response.data as DashboardRejectionRecord[];
  }

  async createRejection(rejectionData: Record<string, unknown>) {
    const response = await this.client.post('/api/rejections', rejectionData);
    return response.data;
  }

  // ============ Compliance Endpoints ============

  async getPendingComplianceLetters(): Promise<DashboardComplianceLetter[]> {
    const response = await this.client.get('/api/compliance/letters/pending');
    return response.data as DashboardComplianceLetter[];
  }

  async createComplianceLetter(letterData: Record<string, unknown>) {
    const response = await this.client.post('/api/compliance/letters', letterData);
    return response.data;
  }

  // ============ Analytics Endpoints ============

  async getDashboardAnalytics(): Promise<DashboardAnalytics | null> {
    const response = await this.client.get('/api/analytics/dashboard');
    return response.data as DashboardAnalytics | null;
  }

  async getTrends(days: number = 30): Promise<TrendsResponse> {
    const response = await this.client.get('/api/analytics/trends', { params: { days } });
    return response.data as TrendsResponse;
  }

  // ============ AI/ML Endpoints ============

  async analyzeFraud(claims: FraudDetectionInput[]): Promise<FraudDetectionResult> {
    const response = await this.client.post('/api/ai/fraud-detection', { claims });
    return response.data as FraudDetectionResult;
  }

  async runPredictiveAnalytics(
    historicalData: PredictiveHistoricalPoint[]
  ): Promise<PredictiveAnalyticsResult> {
    const response = await this.client.post('/api/ai/predictive-analytics', {
      historical_data: historicalData
    });
    return response.data as PredictiveAnalyticsResult;
  }

  async getPhysicianRisk(physicianId: string) {
    const response = await this.client.get(`/api/ai/physician-risk/${physicianId}`);
    return response.data;
  }

  // ============ Appeals Endpoints ============

  async createAppeal(appealData: AppealRecordInput): Promise<AppealRecord> {
    const response = await this.client.post('/api/appeals', appealData);
    return response.data as AppealRecord;
  }

  async getAppeals(status?: string): Promise<AppealRecord[]> {
    const response = await this.client.get('/api/appeals', { params: { status } });
    return response.data as AppealRecord[];
  }

  // ============ NPHIES Integration Endpoints ============

  async submitClaimToNPHIES(claimData: Record<string, unknown>) {
    const response = await this.client.post('/api/nphies/submit-claim', claimData);
    return response.data;
  }

  async submitAppealToNPHIES(appealData: Record<string, unknown>) {
    const response = await this.client.post('/api/nphies/submit-appeal', appealData);
    return response.data;
  }

  async getNPHIESClaimResponse(nphiesReference: string) {
    const response = await this.client.get(`/api/nphies/claim-response/${nphiesReference}`);
    return response.data;
  }

  // ============ FHIR Validation Endpoints ============

  async validateFHIR(fhirData: Record<string, unknown>) {
    const response = await this.client.post('/api/fhir/validate', { fhir_data: fhirData });
    return response.data;
  }

  // ============ Teams Integration Endpoints ============

  async sendTeamsComplianceLetter(data: Record<string, unknown>) {
    const response = await this.client.post('/api/teams/notifications/compliance-letter', data);
    return response.data;
  }

  async sendTeamsRejectionSummary(data: Record<string, unknown>) {
    const response = await this.client.post('/api/teams/notifications/rejection-summary', data);
    return response.data;
  }

  async broadcastTeamsMessage(message: string) {
    const response = await this.client.post('/api/teams/notifications/broadcast', { message });
    return response.data;
  }

  async getTeamsInstallations() {
    const response = await this.client.get('/api/teams/installations');
    return response.data;
  }

  async getTeamsHealth() {
    const response = await this.client.get('/api/teams/health');
    return response.data;
  }

  // ============ Notifications Endpoints ============

  async sendWhatsAppNotification(to: string, message: string, template?: string) {
    const response = await this.client.post('/api/notifications/whatsapp', {
      to,
      message,
      template
    });
    return response.data;
  }

  // ============ Audit Endpoints ============

  async getUserAuditTrail(userId: string, limit: number = 100) {
    const response = await this.client.get(`/api/audit/user/${userId}`, { params: { limit } });
    return response.data;
  }

  async getSuspiciousActivity() {
    const response = await this.client.get('/api/audit/suspicious');
    return response.data;
  }

  // ============ Health Check ============

  async healthCheck(): Promise<HealthStatus> {
    const response = await this.client.get('/health');
    return response.data as HealthStatus;
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export class for testing
export { APIClient };
