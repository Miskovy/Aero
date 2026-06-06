import { RefreshTokenRequest } from '../interfaces/auth.interface';

/**
 * Extract the auth_client from the request, checking cookies first and falling
 * back to manual header parsing if necessary.
 */
export function extractClientFromCookie(
  req: RefreshTokenRequest,
): string | undefined {
  // Use parsed cookies (cookie-parser middleware)
  const cookies = req.cookies as Record<string, string> | undefined;
  if (cookies?.auth_client) {
    return cookies.auth_client;
  }

  // Fallback: manual header parsing
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(^|;)\s*auth_client\s*=\s*([^;]+)/);
    if (match?.[2]) {
      return decodeURIComponent(match[2]);
    }
  }

  return undefined;
}
