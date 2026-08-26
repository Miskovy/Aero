"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AeroLogo from '@/components/AeroLogo';
import { authService } from '@/services/api/auth.service';
import { PasswordInput } from '@/components/ui/PasswordInput';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        Promise.resolve().then(() => {
          setEmail(emailParam);
        });
      }

      const ready = sessionStorage.getItem('pwd_reset_ready');
      const storedEmail = sessionStorage.getItem('pwd_reset_email');
      if (ready === 'true' && storedEmail === emailParam) {
        Promise.resolve().then(() => {
          setStep(2);
          setSuccessMessage('A 6-digit security PIN has been sent to your email.');
          sessionStorage.removeItem('pwd_reset_ready');
          sessionStorage.removeItem('pwd_reset_email');
        });
      }
    }
  }, []);

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSuccessMessage('Security PIN sent! Please check your email inbox.');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 6) {
      setError('Please enter a valid 6-digit PIN.');
      return;
    }

    setIsLoading(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await authService.verifyPIN(email, pin);
      setSuccessMessage('PIN validated successfully. Please configure your new password.');
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await authService.resetPassword(email, pin, password);
      setSuccessMessage('Password reset successfully. Redirecting you to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
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

        {/* --- STEP 1: Email Form --- */}
        {step === 1 && (
          <form onSubmit={handleRequestPin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', fontFamily: 'var(--font-title)' }}>
              Reset Credentials
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              Enter your registered node email address to receive an ephemeral 6-digit authentication PIN.
            </p>

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

            <button
              type="submit"
              disabled={isLoading}
              style={{ marginTop: '4px' }}
            >
              {isLoading ? 'Transmitting PIN...' : 'Send PIN'}
            </button>
          </form>
        )}

        {/* --- STEP 2: PIN Verification Form --- */}
        {step === 2 && (
          <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', fontFamily: 'var(--font-title)' }}>
              Enter Security PIN
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Enter the PIN below:
            </p>

            <input
              type="text"
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                textAlign: 'center',
                letterSpacing: '0.4em',
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)',
                fontSize: '18px',
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Validating PIN...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '12.5px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Change email address
            </button>
          </form>
        )}

        {/* --- STEP 3: Configure New Password Form --- */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', fontFamily: 'var(--font-title)' }}>
              Configure New Password
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              Please configure your refreshed credentials.
            </p>

            <PasswordInput
              label="New Password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{ marginTop: '4px' }}
            >
              {isLoading ? 'Updating credentials...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Status/Success Messages */}
          {successMessage && !error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', fontSize: '12.5px' }}>
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <Link
              href="/login"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block'
              }}
            >
              ← Back to Sign In
            </Link>
          )}
        </div>
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%', maxWidth: '540px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '14px', color: '#f3f0ea', fontFamily: 'var(--font-title)', lineHeight: '1.15' }}>
            Credential <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>Recovery</em>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: '1.65', margin: '0 auto', maxWidth: '420px' }}>
            Ephemeral zero-knowledge recovery handshakes to safeguard your node orchestration and mesh infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
}
