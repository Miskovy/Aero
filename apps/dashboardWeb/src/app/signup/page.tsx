"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GitHubIcon from '@/components/GitHubIcon';
import AeroLogo from '@/components/AeroLogo';
import { getApiUrl } from '@/lib/api-config';
import { Checkbox } from '@/components/ui/Checkbox';

const Hero3DBackground = dynamic(
  () => import('@/components/Hero3DBackground'),
  { ssr: false }
);

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = agreedToLegal;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("You must accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          agreed_to_terms: agreedToLegal,
          agreed_to_privacy: agreedToLegal,
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Registration failed');

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
            Create Developer Account
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
              placeholder="Hypatia of Alexandria"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

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

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Terms & Privacy Agreement Checkbox */}
          <div className="my-0.5 py-1">
            <Checkbox
              id="agree-legal"
              checked={agreedToLegal}
              onChange={(e) => setAgreedToLegal(e.target.checked)}
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
            disabled={isLoading || !isFormValid}
            style={{
              opacity: isLoading || !isFormValid ? 0.5 : 1,
              cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: '12px', marginBottom: '20px' }}>
            <span>Bare-Metal Container Orchestration</span>
          </div>
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
