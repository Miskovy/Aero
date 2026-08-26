"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';
import { getApiUrl } from '@/lib/api-config';
import { authService } from '@/services/api/auth.service';
import { Checkbox } from '@/components/ui/Checkbox';
import { PasswordInput } from '@/components/ui/PasswordInput';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToLegal) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
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

    try {
      await authService.register({
        name,
        email,
        password,
        auth_provider: 'web',
        agreed_to_terms: agreedToLegal,
        agreed_to_privacy: agreedToLegal,
      });

      router.push(`/verify-email?email=${encodeURIComponent(email)}&pending=true`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            Create Account
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
            Initialize your self-hosted cloud mesh and cluster nodes today.
          </p>
        </div>

        <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

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
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
            }}
            required
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={e => {
              setConfirmPassword(e.target.value);
              if (password && e.target.value !== password) {
                setError('Passwords do not match.');
              } else if (error === 'Passwords do not match.') {
                setError(null);
              }
            }}
            required
          />

          {/* Terms & Privacy Agreement Checkbox */}
          <div className="my-0.5 py-1">
            <Checkbox
              id="agree-legal"
              checked={agreedToLegal}
              onChange={(e) => {
                setAgreedToLegal(e.target.checked);
                if (e.target.checked && error?.includes('Terms of Service')) {
                  setError(null);
                }
              }}
              label={
                <span className="text-xs text-[#ccc8be]">
                  I agree to the{' '}
                  <a
                    href="https://aerodeploy.app/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38bdf8] hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://aerodeploy.app/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38bdf8] hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              }
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !agreedToLegal}
            style={{
              opacity: isLoading || !agreedToLegal ? 0.5 : 1,
              cursor: isLoading || !agreedToLegal ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
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
            <span style={{ padding: '0 8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Already registered?</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'currentColor' }} />
          </div>

          <Link
            href="/login"
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>

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
            Autonomous <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>Compute</em>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: '1.65', margin: '0 auto', maxWidth: '420px' }}>
            Deploy apps, databases, and microservices on your own infrastructure without vendor lock-in.
          </p>
        </div>
      </div>
    </div>
  );
}
