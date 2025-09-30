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

  async createRejection(data: any) {
    const response = await api.post('/api/rejections', data);
    return response.data;
  },
};