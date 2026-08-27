import { apiClient } from '@/lib/api-client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  auth_provider?: 'web' | 'CLI' | 'desktop' | 'github';
  agreed_to_terms: boolean;
  agreed_to_privacy: boolean;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    agreed_to_terms: boolean;
    agreed_to_privacy: boolean;
  };
  message: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    agreed_to_terms: boolean;
    agreed_to_privacy: boolean;
  };
}

export const authService = {
  async register(payload: RegisterPayload) {
    return apiClient<RegisterResponse>('auth/register', {
      method: 'POST',
      body: {
        auth_provider: 'web',
        ...payload,
      },
    });
  },

  async login(email: string, password: string) {
    return apiClient<LoginResponse>('auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  async refreshToken() {
    return apiClient<{ access_token: string }>('auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
  },

  async validateToken(access_token: string){
    return apiClient<{ is_valid: boolean }>('auth/validate', {
      method: 'POST',
      credentials: 'include',
      body: { access_token }
    });
  },

  async logout() {
    return apiClient<{ message: string }>('auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  async verifyEmail(token: string) {
    return apiClient<{ message?: string }>('auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  },

  async resendVerification(email: string) {
    return apiClient<{ message: string }>('auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  },

  async forgotPassword(email: string) {
    return apiClient<{ message?: string } | boolean>('auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  async verifyPIN(email: string, pin: string) {
    return apiClient<{ success: boolean }>('auth/verify-reset-pin', {
      method: 'POST',
      body: { email, pin },
    });
  },

  async resetPassword(email: string, pin: string, password: string) {
    return apiClient<{ success: boolean }>('auth/reset-password', {
      method: 'POST',
      body: { email, pin, password },
    });
  },
};