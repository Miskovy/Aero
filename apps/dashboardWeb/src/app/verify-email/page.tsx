"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import AeroLogo from '@/components/AeroLogo';
import { getApiUrl } from '@/lib/api-config';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

function VerifyEmailContent() {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('email') || '';
    }
    return '';
  });
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isPending] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('pending') === 'true';
    }
    return false;
  });

  const verifyEmailToken = useCallback(async (tokenString: string) => {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const response = await fetch(getApiUrl('/auth/verify-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenString }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired verification token.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during verification.');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (tokenParam) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) verifyEmailToken(tokenParam);
      });
      return () => { active = false; };
    }
  }, [verifyEmailToken]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setResendStatus('sending');
    setResendMessage(null);
    try {
      const response = await fetch(getApiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification email.');
      }

      setResendStatus('success');
      setResendMessage(data.message || 'A fresh verification link has been sent to your email.');
    } catch (err) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'An error occurred.');
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

        {/* --- CASE 1: Verifying in Progress --- */}
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
            <div className="throbber" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-title)' }}>
              Confirming Email Address...
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: '1.5' }}>
              Please wait while we verify your cryptographic token handshake.
            </p>
          </div>
        )}

        {/* --- CASE 2: Verification Success --- */}
        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              margin: '0 auto 8px auto'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: 0, fontFamily: 'var(--font-title)' }}>
              Identity Verified
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: '1.6' }}>
              Your email address has been successfully verified. You can now access your cloud console.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                width: '100%',
                padding: '11px 24px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#081018',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              Sign In to Aero
            </button>
          </div>
        )}

        {/* --- CASE 3: Verification Error or Idle (No Token / Expired) --- */}
        {(status === 'error' || status === 'idle') && (
          <div>
            {isPending && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 600 }}>Registration Successful</strong>
                  We sent a verification link to your address. Click the link inside to verify your account.
                </div>
              </div>
            )}

            {status === 'error' ? (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  margin: '0 auto 16px auto'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 8px 0', fontFamily: 'var(--font-title)' }}>
                  Verification Link Expired
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
                  {errorMessage || 'The verification link is invalid or has expired.'}
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-title)' }}>
                  Verify Email Address
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: '1.5' }}>
                  Before accessing the Aero cloud console, please confirm your email address. You can request a fresh link below:
                </p>
              </div>
            )}

            <form onSubmit={handleResendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="developer@node.domain"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={resendStatus === 'sending'}
                style={{ marginTop: '4px' }}
              >
                {resendStatus === 'sending' ? 'Transmitting Link...' : 'Resend Verification Email'}
              </button>

              {resendMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  backgroundColor: resendStatus === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: resendStatus === 'success' ? '#34d399' : '#f87171',
                  border: resendStatus === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span>{resendMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => window.location.href = '/login'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '8px',
                  textAlign: 'center'
                }}
              >
                ← Back to Sign In
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%', maxWidth: '540px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: '12px', marginBottom: '20px' }}>
            <span>Identity Handshake</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '14px', color: '#f3f0ea', fontFamily: 'var(--font-title)', lineHeight: '1.15' }}>
            Verify <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>Identity</em>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: '1.65', margin: '0 auto', maxWidth: '420px' }}>
            Cryptographically validated email handshakes guarantee genuine node ownership and protect cluster reputation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
