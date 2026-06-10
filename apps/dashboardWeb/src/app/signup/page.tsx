"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function SignUpPage() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(baseURL + '/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          auth_provider: 'web'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      window.location.href = `/verify-email?email=${encodeURIComponent(email)}&pending=true`;
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

        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Create your account</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>Get started with your self-hosted cloud today.</p>

        <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (Min. 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>

          <button type="button" className="github-login-button" onClick={() => window.location.href = `${baseURL}/auth/github?client=web`}>
            <GitHubIcon size={18} />
            Continue With GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', color: 'var(--border-glass)' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
            <span style={{ padding: '0 8px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Already have an account?</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
          </div>

          <button
            type="button"
            onClick={() => window.location.href = '/login'}
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
            Log In
          </button>

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
