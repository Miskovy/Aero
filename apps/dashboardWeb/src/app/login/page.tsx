"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';
import { getApiUrl } from '@/lib/api-config';
import { setSessionCookie } from '@/lib/auth';
import { authService } from '@/services/api/auth.service';
import { PasswordInput } from '@/components/ui/PasswordInput';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        setSessionCookie(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        router.push('/');
        return;
      }

      try {
        const response = await authService.refreshToken();
        if (response.access_token) {
          setSessionCookie(response.access_token);
          router.push('/');
        }
      } catch {
        /* Session refresh failed - stay on login page */
      }
    };

    checkSession();
  }, [router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const loginResponse = await authService.login(email, password);
      if (loginResponse.access_token) {
        setSessionCookie(loginResponse.access_token);
      }
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AeroLogo size={30} />
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-title)' }}>
            AERO
          </span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontFamily: 'var(--font-title)' }}>
            Sign In to Console
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
            Access cluster nodes, distributed containers, and workload metrics.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="developer@domain"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            showForgotPassword={true}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isLoading} style={{ marginTop: '4px' }}>
            {isLoading ? 'Connecting...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="github-login-button"
            onClick={() => {
              window.location.href = getApiUrl(
                `/auth/github?client=web&redirect_url=${encodeURIComponent(window.location.origin)}`,
              );
            }}
          >
            <GitHubIcon size={16} />
            Continue with GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', color: 'var(--border-glass)' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
            <span style={{ padding: '0 8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New to Aero?</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
          </div>

          <button
            type="button"
            onClick={() => router.push('/signup')}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Create an Account
          </button>

          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', fontSize: '12.5px' }}>
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%', maxWidth: '540px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '14px', color: '#f3f0ea', fontFamily: 'var(--font-title)', lineHeight: '1.15' }}>
            Self-Hosted <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>Cloud</em>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: '1.65', margin: '0 auto', maxWidth: '420px' }}>
            Turn developer hardware and bare-metal nodes into an architectural, resilient cloud mesh with calm precision.
          </p>
        </div>
      </div>
    </div>
  );
}
