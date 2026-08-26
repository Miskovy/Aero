"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AeroLogo from '@/components/AeroLogo';
import { authService } from '@/services/api/auth.service';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';
  const isPending = searchParams.get('pending') === 'true';

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackEmail, setFallbackEmail] = useState(emailParam);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const activeEmail = emailParam || fallbackEmail;

  const verifyEmailToken = useCallback(async (tokenString: string) => {
    setStatus('verifying');
    setErrorMessage(null);
    try {
      await authService.verifyEmail(tokenString);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during verification.');
    }
  }, []);

  useEffect(() => {
    if (tokenParam) {
      verifyEmailToken(tokenParam);
    }
  }, [tokenParam, verifyEmailToken]);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeEmail) return;

    setResendStatus('sending');
    setResendMessage(null);
    try {
      const response = await authService.resendVerification(activeEmail);
      setResendStatus('success');
      setResendMessage(response?.message || 'A fresh verification link has been dispatched to your email.');
    } catch (err) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to resend verification email.');
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

        {/* --- CASE 1: Verification in Progress (Token present) --- */}
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
            <Link
              href="/login"
              style={{
                width: '100%',
                padding: '11px 24px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#081018',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '12px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block'
              }}
            >
              Sign In to Aero
            </Link>
          </div>
        )}

        {/* --- CASE 3: Pending Registration / Idle / Error --- */}
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
                  We have dispatched an identity verification link to your email. Click the link inside to activate your account.
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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-title)' }}>
                  Check Your Inbox
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, lineHeight: '1.5' }}>
                  Click the link sent to your email to verify your node credentials. Did not receive it? You can resend the link below:
                </p>
              </div>
            )}

            {/* Email Display Card if email is available */}
            {activeEmail ? (
              <div style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Email
                </span>
                <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {activeEmail}
                </span>
              </div>
            ) : (
              /* Fallback input only if URL has no email */
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="developer@domain"
                  value={fallbackEmail}
                  onChange={e => setFallbackEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                type="submit"
                disabled={resendStatus === 'sending' || !activeEmail}
                style={{ marginTop: '2px' }}
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

              <Link
                href="/login"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'block'
                }}
              >
                ← Back to Sign In
              </Link>
            </form>
          </div>
        )}
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%', maxWidth: '540px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '14px', color: '#f3f0ea', fontFamily: 'var(--font-title)', lineHeight: '1.15' }}>
            Verify <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>Identity</em>
          </h1>
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
