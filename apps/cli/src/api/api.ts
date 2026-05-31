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

// ─── Axios Client ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  timeout: 30_000, // 30 seconds — cold-start Render instances can be slow
});

// Dynamically resolve baseURL before every request
apiClient.interceptors.request.use((config) => {
  config.baseURL = ConfigManager.get('apiUrl');

  const token = ConfigManager.get('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    // Handle 401 specifically — expired or invalid token
    if (error.response?.status === 401) {
      ConfigManager.clearToken();
      const message = 'Session expired. Please run `aero login` to authenticate.';
      return Promise.reject(new Error(message));
    }

    const serverMessage = (error.response?.data as any)?.message;
    const errorMessage = serverMessage || error.message || 'An unknown API error occurred.';
    return Promise.reject(new Error(errorMessage));
  },
);

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