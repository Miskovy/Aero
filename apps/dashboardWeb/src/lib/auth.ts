/**
 * Centralized Auth & Cookie Utility
 * Single source of truth for accessing session credentials across the dashboard.
 */

export function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; aero_session=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function setSessionCookie(token: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `aero_session=${token}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'aero_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}
