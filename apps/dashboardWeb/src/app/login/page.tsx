"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function LoginPage() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(errorParam);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (token) {
        document.cookie = `aero_session=${token}; path=/; max-age=${86400}; SameSite=Lax`;
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.href = '/';
        return;
      }

      // If no token in URL, try silent refresh using the HttpOnly cookie
      try {
        const response = await fetch(baseURL + '/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.access_token) {
            document.cookie = `aero_session=${data.access_token}; path=/; max-age=${86400}; SameSite=Lax`;
            window.location.href = '/';
            return;
          }
        }
      } catch (err) {
        console.error('Silent refresh failed:', err);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsCheckingSession(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [baseURL]);

  if (isCheckingSession) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#f4f4f5',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <style>{`
          @keyframes pulseScale {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.9; }
          }
          .custom-spinner {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: radial-gradient(circle, var(--accent-cyan, #06b6d4) 0%, transparent 70%);
            animation: pulseScale 2s infinite ease-in-out;
            margin-bottom: 20px;
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', marginRight: '21px' }}>
          <AeroLogo size={36} />
          <span style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-0.03em' }}>AERO</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="custom-spinner" />
          <span style={{ fontSize: '12px', color: '#a1a1aa', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500 }}>
            Verifying secure session...
          </span>
        </div>
      </div>
    );
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(baseURL + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Invalid credentials');

      document.cookie = `aero_session=${data.access_token}; path=/; max-age=${86400}; SameSite=Lax`;
      window.location.href = '/';
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AeroLogo size={34} />
          <span style={{ fontSize: '34px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>AERO</span>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-dim)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href="/forgot-password"
                style={{
                  color: 'var(--text-dim)',
                  fontSize: '12px',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  fontWeight: 500,
                }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                Forgot Password?
              </Link>
            </div>
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Login'}
          </button>

          <button
            type="button"
            className="github-login-button"
            onClick={() => {
              const url = process.env.NEXT_PUBLIC_API_URL || '';
              const target = (!url || url === '/api')
                ? '/api/auth/github?client=web'
                : url.endsWith('/api/v1')
                  ? `${url}/auth/github?client=web`
                  : `${url.replace(/\/+$/, '')}/api/v1/auth/github?client=web`;
              window.location.href = target;
            }}
          >
            <GitHubIcon size={18} />
            Continue With GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', color: 'var(--border-glass)' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
            <span style={{ padding: '0 8px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New to Aero?</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
          </div>

          <button
            type="button"
            onClick={() => window.location.href = '/signup'}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Create an Account
          </button>

          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="error-alert-box">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.49997 0.833313C3.81807 0.833313 0.833302 3.81808 0.833302 7.50001C0.833302 11.1819 3.81807 14.1667 7.49997 14.1667C11.1819 14.1667 14.1666 11.1819 14.1666 7.50001C14.1666 3.81808 11.1819 0.833313 7.49997 0.833313ZM8.12497 4.37501V8.12501H6.87497V4.37501H8.12497ZM8.12497 9.37501V10.625H6.87497V9.37501H8.12497Z" fill="currentColor" />
                </svg>
                <span>{error}</span>
              </div>
              {error.includes('verify your email') && (
                <button
                  type="button"
                  onClick={() => window.location.href = `/verify-email?email=${encodeURIComponent(email)}`}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--accent-cyan, #06b6d4)',
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: 'var(--accent-cyan, #06b6d4)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Go to Verification Page
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="login-banner">
        <Hero3DBackground />

        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Self-Hosted <em>Cloud</em>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '15px', lineHeight: '1.6', margin: '0 auto' }}>
            Turn your local machines and developer hardware into high-performance servers instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
