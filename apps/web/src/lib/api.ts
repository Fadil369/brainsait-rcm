/**
 * BrainSAIT API Client
 * Centralized API communication layer
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

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

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    if (response.data.access_token) {
      this.setAuthToken(response.data.access_token);
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearAuthToken();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // ============ Rejections Endpoints ============

  async getCurrentMonthRejections() {
    const response = await this.client.get('/api/rejections/current-month');
    return response.data;
  }

  async createRejection(rejectionData: any) {
    const response = await this.client.post('/api/rejections', rejectionData);
    return response.data;
  }

  // ============ Compliance Endpoints ============

  async getPendingComplianceLetters() {
    const response = await this.client.get('/api/compliance/letters/pending');
    return response.data;
  }

  async createComplianceLetter(letterData: any) {
    const response = await this.client.post('/api/compliance/letters', letterData);
    return response.data;
  }

  // ============ Analytics Endpoints ============

  async getDashboardAnalytics() {
    const response = await this.client.get('/api/analytics/dashboard');
    return response.data;
  }

  async getTrends(days: number = 30) {
    const response = await this.client.get('/api/analytics/trends', { params: { days } });
    return response.data;
  }

  // ============ AI/ML Endpoints ============

  async analyzeFraud(claims: any[]) {
    const response = await this.client.post('/api/ai/fraud-detection', { claims });
    return response.data;
  }

  async runPredictiveAnalytics(historicalData: any[]) {
    const response = await this.client.post('/api/ai/predictive-analytics', {
      historical_data: historicalData
    });
    return response.data;
  }

  async getPhysicianRisk(physicianId: string) {
    const response = await this.client.get(`/api/ai/physician-risk/${physicianId}`);
    return response.data;
  }

  // ============ Appeals Endpoints ============

  async createAppeal(appealData: any) {
    const response = await this.client.post('/api/appeals', appealData);
    return response.data;
  }

  async getAppeals(status?: string) {
    const response = await this.client.get('/api/appeals', { params: { status } });
    return response.data;
  }

  // ============ NPHIES Integration Endpoints ============

  async submitClaimToNPHIES(claimData: any) {
    const response = await this.client.post('/api/nphies/submit-claim', claimData);
    return response.data;
  }

  async submitAppealToNPHIES(appealData: any) {
    const response = await this.client.post('/api/nphies/submit-appeal', appealData);
    return response.data;
  }

  async getNPHIESClaimResponse(nphiesReference: string) {
    const response = await this.client.get(`/api/nphies/claim-response/${nphiesReference}`);
    return response.data;
  }

  // ============ FHIR Validation Endpoints ============

  async validateFHIR(fhirData: any) {
    const response = await this.client.post('/api/fhir/validate', { fhir_data: fhirData });
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

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export class for testing
export { APIClient };
