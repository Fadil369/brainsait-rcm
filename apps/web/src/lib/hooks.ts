/**
 * BrainSAIT React Hooks
 * Custom hooks for data fetching and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';
import { RejectionRecord } from '@brainsait/rejection-tracker';
import { ComplianceLetter } from '@brainsait/notification-service';

/**
 * Hook for fetching dashboard data
 */
export function useDashboardData() {
  const [data, setData] = useState<{
    rejections: RejectionRecord[];
    letters: ComplianceLetter[];
    analytics: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rejections, letters, analytics] = await Promise.all([
        apiClient.getCurrentMonthRejections(),
        apiClient.getPendingComplianceLetters(),
        apiClient.getDashboardAnalytics(),
      ]);

      setData({ rejections, letters, analytics });
    } catch (err) {
      setError(err as Error);
      console.error('Dashboard data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for authentication
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setUser(null);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return { user, loading, error, login, logout, refetch: checkAuth };
}

/**
 * Hook for fetching trends data
 */
export function useTrends(days: number = 30) {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTrends(days);
      setTrends(data);
    } catch (err) {
      setError(err as Error);
      console.error('Trends fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return { trends, loading, error, refetch: fetchTrends };
}

/**
 * Hook for fraud detection analysis
 */
export function useFraudDetection() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = async (claims: any[]) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.analyzeFraud(claims);
      setResult(data);
      return data;
    } catch (err) {
      setError(err as Error);
      console.error('Fraud analysis failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, analyze };
}

/**
 * Hook for predictive analytics
 */
export function usePredictiveAnalytics() {
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const predict = async (historicalData: any[]) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.runPredictiveAnalytics(historicalData);
      setPredictions(data);
      return data;
    } catch (err) {
      setError(err as Error);
      console.error('Predictive analytics failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { predictions, loading, error, predict };
}

/**
 * Hook for managing appeals
 */
export function useAppeals(status?: string) {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchAppeals();
  }, [status]);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getAppeals(status);
      setAppeals(data);
    } catch (err) {
      setError(err as Error);
      console.error('Appeals fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAppeal = async (appealData: any) => {
    try {
      const newAppeal = await apiClient.createAppeal(appealData);
      setAppeals([newAppeal, ...appeals]);
      return newAppeal;
    } catch (err) {
      console.error('Create appeal failed:', err);
      throw err;
    }
  };

  return { appeals, loading, error, createAppeal, refetch: fetchAppeals };
}

/**
 * Hook for health check
 */
export function useHealthCheck() {
  const [health, setHealth] = useState<any>(null);
  const [isHealthy, setIsHealthy] = useState(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const data = await apiClient.healthCheck();
      setHealth(data);
      setIsHealthy(data.status === 'healthy');
    } catch (err) {
      setHealth(null);
      setIsHealthy(false);
    }
  };

  return { health, isHealthy, refetch: checkHealth };
}
