import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RejectionData {
  claimId?: string;
  tpaName?: string;
  insuranceCompany?: string;
  branch?: string;
  receptionMode?: string;
  billedAmount?: { net?: number; vat?: number; total?: number };
  rejectedAmount?: { net?: number; vat?: number; total?: number };
  rejectionReceivedDate?: string;
  rejectionReason?: string;
  nphiesReference?: string;
  [key: string]: unknown;
}

export const apiService = {
  async getDashboardStats() {
    const response = await api.get('/api/dashboard/stats');
    return response.data;
  },

  async getRejections() {
    const response = await api.get('/api/rejections/current-month');
    return response.data;
  },

  async getComplianceLetters() {
    const response = await api.get('/api/compliance/letters/pending');
    return response.data;
  },

  async createRejection(data: RejectionData) {
    const response = await api.post('/api/rejections', data);
    return response.data;
  },
};