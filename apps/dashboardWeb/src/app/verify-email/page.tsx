"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import AeroLogo from '@/components/AeroLogo';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

function VerifyEmailContent() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const verifyEmailToken = useCallback(async (tokenString: string) => {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const response = await fetch(`${baseURL}/auth/verify-email`, {
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
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    }
  }, [baseURL]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      const timer = setTimeout(() => {
        verifyEmailToken(urlToken);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [verifyEmailToken]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setResendStatus('sending');
    setResendMessage(null);
    try {
      const response = await fetch(`${baseURL}/auth/resend-verification`, {
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
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AeroLogo size={34} />
          <span style={{ fontSize: '34px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>AERO</span>
        </div>

        {/* --- CASE 1: Verifying in Progress --- */}
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
            <style>{`
              @keyframes pulseScale {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.15); opacity: 0.9; }
              }
              .verify-spinner {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: radial-gradient(circle, var(--accent-cyan, #06b6d4) 0%, transparent 70%);
                animation: pulseScale 1.8s infinite ease-in-out;
              }
            `}</style>
            <div className="verify-spinner" />
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', margin: 0 }}>Confirming email address...</h2>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0, lineHeight: '1.5' }}>
              Please wait while we verify your security credentials.
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
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              margin: '0 auto 8px auto'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: 0 }}>Email Verified!</h2>
            <p style={{ fontSize: '14px', color: '#a1a1aa', textAlign: 'center', margin: 0, lineHeight: '1.6' }}>
              Your email address has been successfully verified. You can now access your dashboard.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: '#ffffff',
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
            {status === 'error' ? (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  margin: '0 auto 16px auto'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 8px 0' }}>Verification Failed</h2>
                <p style={{ fontSize: '14px', color: '#a1a1aa', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
                  {errorMessage || 'The verification link is invalid or has expired.'}
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Verify Your Email</h2>
                <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0, lineHeight: '1.5' }}>
                  Before accessing the Aero cloud portal, please confirm your email address. If you haven&apos;t received a link or it has expired, you can request a new one below:
                </p>
              </div>
            )}

            <form onSubmit={handleResendSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={resendStatus === 'sending'}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {resendStatus === 'sending' ? 'Sending Link...' : 'Resend Verification Email'}
              </button>

              {resendMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: resendStatus === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: resendStatus === 'success' ? '#22c55e' : '#ef4444',
                  border: resendStatus === 'success' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
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
                  color: '#a1a1aa',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '12px',
                  textAlign: 'center'
                }}
              >
                Back to Sign In
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Verify Identity
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '15px', lineHeight: '1.6', margin: '0 auto' }}>
            We secure every account with cryptographic email handshakes to prevent automated spam and unauthorized cloud abuse.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#09090b' }} />
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
