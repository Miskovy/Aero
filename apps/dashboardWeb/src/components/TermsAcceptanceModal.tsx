'use client';

import React, { useState } from 'react';
import AeroLogo from './AeroLogo';
import { Checkbox } from './ui/Checkbox';
import { getApiUrl } from '@/lib/api-config';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccepted: () => void;
  token?: string;
}

export default function TermsAcceptanceModal({ isOpen, onAccepted, token }: TermsAcceptanceModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!agreed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let activeToken = token;
      if (!activeToken && typeof document !== 'undefined') {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; aero_session=`);
        if (parts.length === 2) activeToken = parts.pop()?.split(';').shift();
      }

      const res = await fetch(getApiUrl('/users/me/agree-terms'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update agreement status.');
      }

      onAccepted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#0c0d10',
          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.12))',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AeroLogo size={32} />
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            AERO
          </span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Terms &amp; Privacy Policy Update
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-dim, #94a3b8)', lineHeight: '1.6', marginBottom: '24px' }}>
          To continue using Aero services and manage your cloud infrastructure, please review and accept our Terms of Service and Privacy Policy.
        </p>

        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <Checkbox
            id="modal-agree-legal"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            label={
              <span>
                I agree to the{' '}
                <a
                  href="https://aerodeploy.app/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="https://aerodeploy.app/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                .
              </span>
            }
          />
        </div>

        {error && (
          <div
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || isSubmitting}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            color: '#09090b',
            backgroundColor: '#38bdf8',
            border: 'none',
            cursor: agreed && !isSubmitting ? 'pointer' : 'not-allowed',
            opacity: agreed && !isSubmitting ? 1 : 0.4,
            transition: 'all 0.2s ease',
          }}
        >
          {isSubmitting ? 'Accepting...' : 'Accept & Continue'}
        </button>
      </div>
    </div>
  );
}
