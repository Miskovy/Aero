'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AeroLogo from './AeroLogo';

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

export default function DashboardLayoutWrapper({ children }: DashboardLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  useEffect(() => {
    const token = getSessionCookie('aero_session');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        setTimeout(() => {
          if (payload.name) setUserName(payload.name);
          if (payload.email) setUserEmail(payload.email);
        }, 0);
      } catch (e) {
        console.error('Failed to parse active user token', e);
      }
    }
  }, []);

  useEffect(() => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
    let isRefreshing = false;

    const performRefresh = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const response = await fetch(baseURL + '/auth/refresh', {
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
        console.error('Failed proactive session refresh:', err);
      } finally {
        isRefreshing = false;
      }
    };

    const checkAndRefresh = () => {
      const token = getSessionCookie('aero_session');
      if (!token) return;

      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        const exp = payload.exp;

        if (exp) {
          const timeLeft = exp * 1000 - Date.now();
          if (timeLeft < 300_000) {
            console.log(`Access token expiring/expired in ${Math.round(timeLeft / 1000)}s. Refreshing...`);
            performRefresh();
          }
        }
      } catch (e) {
        console.error('Error in proactive token check:', e);
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
  } else if (pathname === '/settings') {
    pageTitle = 'Settings';
  }

  const handleLogout = async () => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      await fetch(`${baseURL}/auth/logout`, {
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

          <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <p className="nav-label">SETTINGS</p>
          </Link>
        </nav>

        {/* 👤 Profile Icon Section at the End */}
        <div className="profile-container-bottom">
          <div className="profile-details-row">
            {/* Avatar Circle with Name Initial */}
            <div className="profile-avatar">
              {userName.trim().charAt(0).toUpperCase()}
            </div>
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
          {children}
        </main>
      </div>
    </div>
  );
}
