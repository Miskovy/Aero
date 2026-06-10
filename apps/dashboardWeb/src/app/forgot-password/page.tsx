"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import AeroLogo from '@/components/AeroLogo';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function ForgotPasswordPage() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // STEP 1: Request PIN Code
  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request reset PIN.');
      }

      setSuccessMessage('A 6-digit security PIN has been dispatched to your email.');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify PIN Code
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 6) {
      setError('Please enter a valid 6-digit PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseURL}/auth/verify-reset-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, pin }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired security PIN.');
      }

      setSuccessMessage('PIN validated successfully. Please configure your new password.');
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Complete Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, pin, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

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
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AeroLogo size={34} />
          <span style={{ fontSize: '34px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>AERO</span>
        </div>

        {/* --- STEP 1: Email Form --- */}
        {step === 1 && (
          <form onSubmit={handleRequestPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>Reset Password</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              Enter your email address below and we will send you a 6-digit confirmation PIN code to authenticate your request.
            </p>

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
              disabled={isLoading}
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
              {isLoading ? 'Requesting...' : 'Send Reset PIN'}
            </button>
          </form>
        )}

        {/* --- STEP 2: PIN Verification Form --- */}
        {step === 2 && (
          <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>Enter Security PIN</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              We sent a 6-digit code to <strong>{email}</strong>. Enter the PIN code below to confirm authorization:
            </p>

            <input
              type="text"
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#09090b',
                border: '1px solid #27272a',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '20px',
                textAlign: 'center',
                letterSpacing: '0.5em',
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
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
              {isLoading ? 'Validating PIN...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                fontSize: '13px',
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
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>Configure Password</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              Please enter your new password configuration details.
            </p>

            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
              disabled={isLoading}
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
              {isLoading ? 'Configuring...' : 'Configure New Password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Status/Success Messages */}
          {successMessage && !error && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-alert-box">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.49997 0.833313C3.81807 0.833313 0.833302 3.81808 0.833302 7.50001C0.833302 11.1819 3.81807 14.1667 7.49997 14.1667C11.1819 14.1667 14.1666 11.1819 14.1666 7.50001C14.1666 3.81808 11.1819 0.833313 7.49997 0.833313ZM8.12497 4.37501V8.12501H6.87497V4.37501H8.12497ZM8.12497 9.37501V10.625H6.87497V9.37501H8.12497Z" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>

      <div className="login-banner">
        <Hero3DBackground />
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 40px', width: '100%' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Aero Gatekeeper
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '15px', lineHeight: '1.6', margin: '0 auto' }}>
            Secure cryptographically validated password recovery pathways utilizing volatile memory storage for zero persistent footprint.
          </p>
        </div>
      </div>
    </div>
  );
}
