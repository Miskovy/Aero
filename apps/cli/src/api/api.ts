/**
 * api.ts — HTTP client and authentication layer.
 *
 * Uses ConfigManager as the single source of truth for token and API URL.
 * Provides:
 *   - Pre-configured axios client with dynamic baseURL
 *   - Request interceptor that injects the auth token
 *   - Response interceptor with 401-specific handling
 *   - requireAuth() guard for commands that need a logged-in user
 *   - Typed apiRequest<T>() convenience wrapper
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import chalk from 'chalk';
import ConfigManager from '../utils/config.js';

export function getApiBaseUrl(): string {
  let url = ConfigManager.get('apiUrl') || 'http://localhost:3000';
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
}

// ─── Axios Client ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  timeout: 30_000, // 30 seconds — cold-start Render instances can be slow
});

// Dynamically resolve baseURL before every request
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  const token = ConfigManager.get('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Helper to parse cookies from Set-Cookie header
function extractRefreshToken(headers: any): string | null {
  const setCookieHeader = headers?.['set-cookie'] || headers?.['Set-Cookie'];
  if (setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const cookieStr of cookies) {
      if (cookieStr.startsWith('aero_rt=')) {
        const match = cookieStr.match(/aero_rt=([^;]+)/);
        if (match) {
          return match[1];
        }
      }
    }
  }
  return null;
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Normalize error responses and handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    const rt = extractRefreshToken(response.headers);
    if (rt) {
      ConfigManager.set('refreshToken', rt);
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Skip refreshing if this request was to the refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      ConfigManager.clearToken();
      const message = 'Session expired. Please run `aero login` to authenticate.';
      return Promise.reject(new Error(message));
    }

    // Handle 401 specifically — expired or invalid token
    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      const refreshToken = ConfigManager.get('refreshToken');
      if (refreshToken) {
        (originalRequest as any)._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
          const baseUrl = getApiBaseUrl();
          const refreshResponse = await axios.post(
            `${baseUrl}/auth/refresh`,
            {},
            {
              headers: {
                Cookie: `aero_rt=${refreshToken}`,
              },
            }
          );

          const newAccessToken = refreshResponse.data?.access_token;
          if (!newAccessToken) {
            throw new Error('No access token returned on refresh');
          }

          ConfigManager.set('token', newAccessToken);

          const rt = extractRefreshToken(refreshResponse.headers);
          if (rt) {
            ConfigManager.set('refreshToken', rt);
          }

          isRefreshing = false;
          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError, null);
          ConfigManager.clearToken();
          const message = 'Session expired. Please run `aero login` to authenticate.';
          return Promise.reject(new Error(message));
        }
      } else {
        ConfigManager.clearToken();
        const message = 'Session expired. Please run `aero login` to authenticate.';
        return Promise.reject(new Error(message));
      }
    }

    const serverMessage = (error.response?.data as any)?.message;
    const errorMessage = serverMessage || error.message || 'An unknown API error occurred.';
    return Promise.reject(new Error(errorMessage));
  },
);

// ─── Data Unwrapping Helpers ──────────────────────────────────────────────────

export function unwrapData<T = any>(response: any): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  return [];
}

export function unwrapItem<T = any>(response: any): T {
  if (response && typeof response === 'object' && 'data' in response && !Array.isArray(response.data)) {
    return response.data as T;
  }
  return response as T;
}

// ─── Typed Request Helper ────────────────────────────────────────────────────

export async function apiRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  return apiClient.request<any, T>(config);
}

// ─── Auth Guard ──────────────────────────────────────────────────────────────

/**
 * Check that the user is authenticated before running a command.
 * Returns true if authenticated, false if not (and prints a helpful message).
 *
 * Usage:
 * ```ts
 * export async function servicesListAction() {
 *   if (!requireAuth()) return;
 *   // ... proceed
 * }
 * ```
 */
export function requireAuth(): boolean {
  if (ConfigManager.isAuthenticated()) return true;

  console.log('');
  console.log(chalk.yellow('  You are not logged in.'));
  console.log(chalk.dim(`  Run ${chalk.cyan('aero login')} or ${chalk.cyan('aero githublogin')} to authenticate.`));
  console.log('');
  return false;
}

// ─── GitHub Token Exchange ───────────────────────────────────────────────────

export async function exchangeGithubTokenWithAero(
  githubAccessToken: string,
): Promise<{ access_token: string }> {
  return apiRequest({
    method: 'POST',
    url: '/auth/github/exchange',
    data: { accessToken: githubAccessToken },
  });
}