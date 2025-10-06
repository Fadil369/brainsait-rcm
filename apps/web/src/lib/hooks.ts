/**
 * BrainSAIT React Hooks
 * Custom hooks for data fetching and state management
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  AppealRecord,
  AppealRecordInput,
  AuthUser,
  DashboardDataPayload,
  FraudDetectionInput,
  FraudDetectionResult,
  HealthStatus,
  LoginResponse,
  PredictiveAnalyticsResult,
  PredictiveHistoricalPoint,
  TrendsResponse,
} from '@/types/api';

import { apiClient } from './api';

const toError = (error: unknown, fallbackMessage: string): Error =>
  error instanceof Error ? error : new Error(fallbackMessage);

/**
 * Hook for fetching dashboard data
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardDataPayload | null>(null);
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

      setData({
        rejections,
        letters,
        analytics: analytics ?? null,
      });
    } catch (caughtError) {
      const err = toError(caughtError, 'Failed to load dashboard data');
      setError(err);
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (caughtError) {
      setUser(null);
      const err = toError(caughtError, 'Failed to resolve current user');
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.login(email, password);
      setUser(response.user ?? null);
      return response;
    } catch (caughtError) {
      const err = toError(caughtError, 'Login failed');
      setError(err);
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
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTrends(days);
      setTrends(data);
    } catch (caughtError) {
      const err = toError(caughtError, 'Failed to load trends');
      setError(err);
      console.error('Trends fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch: fetchTrends };
}

/**
 * Hook for fraud detection analysis
 */
export function useFraudDetection() {
  const [result, setResult] = useState<FraudDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(async (claims: FraudDetectionInput[]) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.analyzeFraud(claims);
      setResult(data);
      return data;
    } catch (caughtError) {
      const err = toError(caughtError, 'Fraud analysis failed');
      setError(err);
      console.error('Fraud analysis failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, analyze };
}

/**
 * Hook for predictive analytics
 */
export function usePredictiveAnalytics() {
  const [predictions, setPredictions] = useState<PredictiveAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const predict = useCallback(async (historicalData: PredictiveHistoricalPoint[]) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.runPredictiveAnalytics(historicalData);
      setPredictions(data);
      return data;
    } catch (caughtError) {
      const err = toError(caughtError, 'Predictive analytics failed');
      setError(err);
      console.error('Predictive analytics failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { predictions, loading, error, predict };
}

/**
 * Hook for managing appeals
 */
export function useAppeals(status?: string) {
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getAppeals(status);
      setAppeals(Array.isArray(data) ? data : []);
    } catch (caughtError) {
      const err = toError(caughtError, 'Appeals fetch failed');
      setError(err);
      console.error('Appeals fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchAppeals();
  }, [fetchAppeals]);

  const createAppeal = useCallback(async (appealData: AppealRecordInput) => {
    try {
      const newAppeal = await apiClient.createAppeal(appealData);
      setAppeals((prev) => [newAppeal, ...prev]);
      return newAppeal;
    } catch (caughtError) {
      console.error('Create appeal failed:', caughtError);
      throw caughtError;
    }
  }, []);

  return { appeals, loading, error, createAppeal, refetch: fetchAppeals };
}

/**
 * Hook for health check
 */
export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const data = await apiClient.healthCheck();
      setHealth(data);
      setIsHealthy(data.status === 'healthy');
  } catch {
      setHealth(null);
      setIsHealthy(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [checkHealth]);

  return { health, isHealthy, refetch: checkHealth };
}
