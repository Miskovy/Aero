/**
 * Aero Global API Configuration & URL Normalizer
 *
 * Architecturally ensures that all API requests from the web dashboard
 * correctly target the versioned API base (/api/v1), both when using
 * Next.js server proxy rewrites and direct client requests.
 */

export function getApiBaseUrl(): string {
  // Server-side execution (SSR / Server Components in Node.js)
  // Node.js fetch requires an absolute URL with scheme and host.
  if (typeof window === 'undefined') {
    const serverUrl =
      process.env.AERO_API_URL ||
      process.env.API_URL ||
      (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== '/api'
        ? process.env.NEXT_PUBLIC_API_URL
        : undefined) ||
      'http://localhost:3000';

    const cleanUrl = serverUrl.replace(/\/+$/, '');
    if (cleanUrl.endsWith('/api/v1')) {
      return cleanUrl;
    }
    if (cleanUrl.endsWith('/api')) {
      return `${cleanUrl}/v1`;
    }
    return `${cleanUrl}/api/v1`;
  }

  // Client-side execution (Browser environment)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // Case 1: Relying on relative paths / Next.js proxy rewrites in browser
  if (!envUrl || envUrl === '/api') {
    return '/api'; // Next.js rewrite rule maps /api/:path* to {target}/api/v1/:path*
  }

  // Case 2: Direct absolute API URL provided in environment (e.g., https://aero-y6mm.onrender.com)
  const cleanUrl = envUrl.replace(/\/+$/, '');

  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/v1`;
  }
  return `${cleanUrl}/api/v1`;
}

/**
 * Constructs a fully qualified versioned API endpoint URL.
 * Example: getApiUrl('/auth/login') -> 'https://aero-y6mm.onrender.com/api/v1/auth/login'
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If using Next.js proxy rewrites (/api), /api/auth/login rewrites to /api/v1/auth/login
  if (base === '/api') {
    return `/api${normalizedPath}`;
  }

  return `${base}${normalizedPath}`;
}
