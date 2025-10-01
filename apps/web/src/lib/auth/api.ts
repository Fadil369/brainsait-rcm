// Authentication API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  refresh_token: string;
  token_type: string;
  expires_in: number;
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
      const token = localStorage.getItem('access_token');
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
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }

  async requestOTP(data: OTPRequest): Promise<{ message: string; expires_in: number }> {
    const response = await fetch(`${API_BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
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
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  async logout(refreshToken: string): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/password/change`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Password change failed');
    }
  }
}

export const authAPI = new AuthAPI();
