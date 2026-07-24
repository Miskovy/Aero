"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';
import { getApiUrl } from '@/lib/api-config';

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
        router.push('/');
        return;
      }

      try {
        const response = await fetch(getApiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.access_token) {
            document.cookie = `aero_session=${data.access_token}; path=/; max-age=${86400}; SameSite=Lax`;
            router.push('/');
          }
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
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Invalid credentials');

      if (data.access_token) {
        document.cookie = `aero_session=${data.access_token}; path=/; max-age=${86400}; SameSite=Lax`;
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
            required
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: '40px' }}
                required
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
                {showPassword ? 'Hide' : 'Show'}
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
              window.location.href = getApiUrl(
                `/auth/github?client=web&redirect_url=${encodeURIComponent(window.location.origin)}`,
              );
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
            onClick={() => router.push('/signup')}
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
          >
            Create an Account
          </button>

          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="error-alert-box" style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '13px' }}>
                <span>{error}</span>
              </div>
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
