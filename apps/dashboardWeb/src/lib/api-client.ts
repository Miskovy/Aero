import { getApiUrl } from './api-config';
import { getSessionToken, clearSessionCookie } from './auth';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  retries?: number;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Universal Resilient API Client Wrapper
 * Features: Timeout controls (AbortController), retries with backoff, session expiration events.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    headers: customHeaders,
    body,
    timeoutMs = 15000,
    retries = options.method === 'GET' || !options.method ? 2 : 0,
    ...customOptions
  } = options;

  let url = getApiUrl(endpoint);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getSessionToken();

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customOptions,
    headers: {
      ...defaultHeaders,
      ...customHeaders,
    },
  };

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body) {
    config.body = body as BodyInit;
  }

  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          clearSessionCookie();
          window.dispatchEvent(new CustomEvent('aero_session_expired'));
        }
      }

      if (!response.ok) {
        // Retry on 502/503/504 gateway timeouts if retries left
        if ([502, 503, 504].includes(response.status) && attempt < retries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
          continue;
        }

        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        const message =
          typeof errorData === 'object' && errorData && 'message' in errorData
            ? String((errorData as { message: unknown }).message)
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, errorData);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (attempt < retries && (err instanceof TypeError || (err as { name?: string }).name === 'AbortError')) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
        continue;
      }
      throw err;
    }
  }

  throw new ApiError('Max request retries exceeded', 504);
}
