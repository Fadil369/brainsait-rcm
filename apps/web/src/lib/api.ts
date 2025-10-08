/**
 * BrainSAIT API Client
 * Centralized API communication layer
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

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

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const enforceHttps = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' && !LOCAL_HOSTS.has(parsed.hostname)) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
    return parsed.toString();
  } catch (error) {
    console.warn('Unable to parse API URL, falling back to original value', error);
    return url;
  }
};

const DEFAULT_DEV_API_URL = 'http://localhost:8000';
const DEFAULT_PROD_API_URL = 'https://brainsait-rcm.pages.dev';

const API_URL = enforceHttps(
  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL)
);

const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;

let inMemoryAccessToken: string | null = null;

const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

const getAccessToken = () => inMemoryAccessToken;

/**
 * API Client Configuration
 */
class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseURL = API_URL.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor - attach auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAccessToken();
        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as (AxiosRequestConfig & { __isRetryRequest?: boolean }) | undefined;

        if (status === 401 && originalRequest && !originalRequest.__isRetryRequest) {
          setAccessToken(null);

          const newToken = await this.refreshAccessToken();

          if (newToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest.__isRetryRequest = true;
            return this.client.request(originalRequest);
          }

          if (typeof window !== 'undefined' && !originalRequest.url?.includes('/api/auth/login')) {
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private unwrapResponse<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = axios
      .post(
        `${this.baseURL}/api/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: API_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      .then((response) => {
        const data = this.unwrapResponse<{ access_token?: string }>(response.data);
        if (data?.access_token) {
          setAccessToken(data.access_token);
          return data.access_token;
        }
        return null;
      })
      .catch((refreshError) => {
        console.error('Access token refresh failed:', refreshError);
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  // ============ Authentication Endpoints ============

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post('/api/auth/login', { email, password });
    const data = this.unwrapResponse<LoginResponse>(response.data);

    if (data?.access_token) {
      setAccessToken(data.access_token);
    }

    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout', {});
    } finally {
      setAccessToken(null);
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response = await this.client.get('/api/auth/me');
    return this.unwrapResponse<AuthUser>(response.data);
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

export const getAccessTokenSnapshot = () => getAccessToken();
