import { apiClient, getAccessTokenSnapshot } from '@/lib/api';

// Authentication API client
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const resolveApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://brainsait-rcm.pages.dev');

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) {
      url.protocol = 'https:';
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    console.warn('Unable to parse auth API URL, using fallback value', error);
    return raw.replace(/\/$/, '');
  }
};

const API_BASE_URL = resolveApiBaseUrl();

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  email?: string;
  phone?: string;
  username?: string;
  full_name?: string;
  password?: string;
  auth_method: 'password' | 'google' | 'github' | 'email_otp' | 'sms_otp' | 'whatsapp_otp';
}

export interface OTPRequest {
  identifier: string;
  method: 'email' | 'sms' | 'whatsapp';
  purpose: 'login' | 'registration' | 'verification';
}

export interface OTPVerify {
  identifier: string;
  code: string;
  purpose: 'login' | 'registration' | 'verification';
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  full_name?: string;
  role: string;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  last_login?: string;
}

class AuthAPI {
  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = getAccessTokenSnapshot();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async register(data: RegisterData): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const result = await apiClient.login(credentials.identifier, credentials.password);

    return {
      access_token: result?.access_token ?? '',
      token_type: result?.token_type ?? 'Bearer',
      expires_in: result?.expires_in,
    };
  }

  async requestOTP(data: OTPRequest): Promise<{ message: string; expires_in: number }> {
    const response = await fetch(`${API_BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OTP request failed');
    }

    return response.json();
  }

  async verifyOTP(data: OTPVerify): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OTP verification failed');
    }

    return response.json();
  }

  async getOAuthURL(provider: 'google' | 'github'): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/${provider}/authorize`);

    if (!response.ok) {
      throw new Error('Failed to get OAuth URL');
    }

    const data = await response.json();
    return data.authorization_url;
  }

  async handleOAuthCallback(provider: 'google' | 'github', code: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/${provider}/callback?code=${code}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OAuth authentication failed');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    return apiClient.getCurrentUser() as Promise<User>;
  }

  async logout(refreshToken?: string): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
      credentials: 'include',
    });
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/password/change`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Password change failed');
    }
  }
}

export const authAPI = new AuthAPI();
