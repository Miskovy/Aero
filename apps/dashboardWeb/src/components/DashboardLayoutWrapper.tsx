'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AeroLogo from './AeroLogo';
import { getApiUrl } from '@/lib/api-config';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

export default function DashboardLayoutWrapper({ children }: DashboardLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  // Helper to extract session cookies in client-side context
  const getSessionCookie = (name: string) => {
    if (typeof document === 'undefined') return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  const [userName, setUserName] = useState('Console Node');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionCookie('aero_session');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        Promise.resolve().then(() => {
          if (payload.name) setUserName(payload.name);
          if (payload.email) setUserEmail(payload.email);
        });
      } catch (e) {
        console.error('Failed to parse active user token', e);
      }

      // Fetch live user info from the database (including avatar_url)
      const fetchLiveUser = async () => {
        try {
          const res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.name) setUserName(data.name);
            if (data.email) setUserEmail(data.email);
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
          }
        } catch (err) {
          console.error('Failed to fetch live user details:', err);
        }
      };
      
      Promise.resolve().then(() => {
        fetchLiveUser();
      });
    }
  }, []);

  useEffect(() => {
    let isRefreshing = false;

    const performRefresh = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const response = await fetch(getApiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.access_token) {
            document.cookie = `aero_session=${data.access_token}; path=/; max-age=${86400}; SameSite=Lax`;
            console.log('Proactively rotated access token.');
          }
        } else if (response.status === 401) {
          document.cookie = 'aero_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
          window.location.href = '/login';
        }
      } catch (err) {
        console.warn('Failed to perform proactive session refresh:', err);
      } finally {
        isRefreshing = false;
      }
    };

    const checkAndRefresh = () => {
      const token = getSessionCookie('aero_session');
      if (!token) return;

      try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return;
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        const exp = payload.exp;

        if (exp) {
          const timeLeft = exp * 1000 - Date.now();
          if (timeLeft < 300_000) {
            performRefresh();
          }
        }
      } catch {
        /* ignore invalid token format */
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  const pathname = usePathname();

  // Auto-expand settings dropdown when navigating to a settings child route
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active && pathname.startsWith('/settings')) {
        setSettingsOpen(true);
      }
    });
    return () => { active = false; };
  }, [pathname]);

  // Compute pageTitle dynamically during render instead of running inside a useEffect
  let pageTitle = 'Dashboard';
  if (pathname === '/organizations') {
    pageTitle = 'Organizations';
  } else if (pathname === '/projects') {
    pageTitle = 'Projects';
  } else if (pathname === '/nodes') {
    pageTitle = 'Nodes';
  } else if (pathname === '/services') {
    pageTitle = 'Services';
  } else if (pathname === '/marketplace') {
    pageTitle = 'Marketplace';
  } else if (pathname === '/alerts') {
    pageTitle = 'Alert Rules';
  } else if (pathname === '/audit-logs') {
    pageTitle = 'Audit Logs';
  } else if (pathname === '/settings') {
    pageTitle = 'Settings · API Keys';
  } else if (pathname === '/settings/webhooks') {
    pageTitle = 'Settings · Webhooks';
  } else if (pathname === '/profile') {
    pageTitle = 'Profile';
  }

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Failed to logout on server:', e);
    }
    // Expire the session cookie and redirect back to login
    document.cookie = 'aero_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    window.location.href = '/login';
  };

  return (
    <div className="app-layout">
      {/* ⬅️ Sidebar Shell */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

        {/* Top Header & Branding Logo (Interactive Sidebar Toggle) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="logo-toggle-container"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <AeroLogo size={24} className="logo-svg" />
          <span className="logo-text">AERO</span>
        </button>

        {/* Sidebar Nav Links */}
        <nav className="nav-menu">
          <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <p className="nav-label">HOME</p>
          </Link>

          <Link href="/organizations" className={`nav-item ${pathname === '/organizations' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p className="nav-label">ORGANIZATIONS</p>
          </Link>

          <Link href="/projects" className={`nav-item ${pathname === '/projects' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <p className="nav-label">PROJECTS</p>
          </Link>

          <Link href="/services" className={`nav-item ${pathname === '/services' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <p className="nav-label">SERVICES</p>
          </Link>

          <Link href="/nodes" className={`nav-item ${pathname === '/nodes' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <p className="nav-label">NODES</p>
          </Link>

          <Link href="/marketplace" className={`nav-item ${pathname === '/marketplace' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <p className="nav-label">MARKETPLACE</p>
          </Link>

          <Link href="/alerts" className={`nav-item ${pathname === '/alerts' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <p className="nav-label">ALERTS</p>
          </Link>

          <Link href="/audit-logs" className={`nav-item ${pathname === '/audit-logs' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p className="nav-label">AUDIT LOGS</p>
          </Link>

          {/* Settings Dropdown */}
          <div className="nav-dropdown-group">
            <button
              type="button"
              onClick={() => setSettingsOpen(prev => !prev)}
              className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
              style={{ width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="nav-label" style={{ flex: 1, textAlign: 'left' }}>SETTINGS</span>
              <svg
                className="nav-label"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'transform 0.25s ease',
                  transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                  maxWidth: 'none'
                }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Dropdown children */}
            <div
              className="nav-dropdown-children"
              style={{
                maxHeight: settingsOpen && !isCollapsed ? '120px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
                opacity: settingsOpen && !isCollapsed ? 1 : 0,
              }}
            >
              <Link
                href="/settings"
                className={`nav-item nav-child ${pathname === '/settings' ? 'active' : ''}`}
              >
                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <span className="nav-label">API Keys</span>
              </Link>
              <Link
                href="/settings/webhooks"
                className={`nav-item nav-child ${pathname === '/settings/webhooks' ? 'active' : ''}`}
              >
                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 16.98h1.67c2.06 0 3.33-2.22 2.31-4.01L14.31 1.02c-1.03-1.79-3.6-1.79-4.62 0L2.02 12.97c-1.02 1.79.25 4.01 2.31 4.01H6" />
                  <path d="M12 12v4" />
                  <circle cx="12" cy="20" r="2" />
                </svg>
                <span className="nav-label">Webhooks</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* 👤 Profile Icon Section at the End */}
        <div className="profile-container-bottom">
          <div
            className="profile-details-row profile-clickable"
            onClick={() => router.push('/profile')}
            role="button"
            tabIndex={0}
            title="View Profile"
            onKeyDown={(e) => { if (e.key === 'Enter') router.push('/profile'); }}
          >
            {/* Avatar Circle with Name Initial */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName}
                className="profile-avatar"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="profile-avatar">
                {userName.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-meta">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">{userEmail || 'Developer Node'}</span>
            </div>
          </div>

          {/* Action Row */}
          {!isCollapsed ? (
            <button type="button" onClick={handleLogout} className="profile-logout-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </button>
          ) : (
            <button type="button" onClick={handleLogout} className="profile-logout-btn icon-only" title="Sign Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          )}
        </div>

      </aside>

      <div className={`main-content ${isCollapsed ? 'expanded' : ''}`} style={{ paddingTop: '7px' }}>
        <header className="top-header">
          <div className="breadcrumb" style={{ marginLeft: 'auto' }}>
            Aero Console <span>/</span> <strong>{pageTitle}</strong>
          </div>
        </header>

        <main className="content-viewport">
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </main>
      </div>
    </div>
  );
}
