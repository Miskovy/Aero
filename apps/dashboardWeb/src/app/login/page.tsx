"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function LoginPage() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      document.cookie = `aero_session=${token}; path=/; max-age=${86400}; SameSite=Lax`;
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = '/';
    }
  }, []);

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
    } catch (error: any) {
      setError(error.message);
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Login'}
          </button>

          <button type="button" className="github-login-button" onClick={() => window.location.href = `${baseURL}/auth/github?client=web`}>
            <GitHubIcon size={18} />
            Continue With GitHub
          </button>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', marginBottom: '24px', }}>
            Don't have an account? <button type="button" onClick={() => window.location.href = '/signup'} style={{ color: 'var(--text-primary)', backgroundColor: 'transparent' }}>Sign Up</button>
          </label>

          {error && (
            <div className="error-alert-box">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.49997 0.833313C3.81807 0.833313 0.833302 3.81808 0.833302 7.50001C0.833302 11.1819 3.81807 14.1667 7.49997 14.1667C11.1819 14.1667 14.1666 11.1819 14.1666 7.50001C14.1666 3.81808 11.1819 0.833313 7.49997 0.833313ZM8.12497 4.37501V8.12501H6.87497V4.37501H8.12497ZM8.12497 9.37501V10.625H6.87497V9.37501H8.12497Z" fill="currentColor" />
              </svg>
              <span>{error}</span>
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
