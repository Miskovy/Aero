'use client';

import React, { useState } from 'react';
import AeroLogo from './AeroLogo';
import { Checkbox } from './ui/Checkbox';
import { Button } from './ui/Button';
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
    <div className="fixed inset-0 z-[99999] bg-[#0b0d11]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#11141a]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center overflow-hidden">
        
        {/* Soft Ambient Light Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="mb-5 flex items-center gap-3 relative z-1">
          <AeroLogo size={30} />
          <span className="text-2xl font-bold tracking-tight text-[#f3f0ea] font-title">
            AERO
          </span>
        </div>

        <h2 className="text-lg font-semibold text-[#f3f0ea] mb-2 tracking-tight relative z-1 font-title">
          Terms &amp; Privacy Update
        </h2>
        <p className="text-xs text-[#88909c] leading-relaxed mb-6 relative z-1">
          To manage your cloud infrastructure and node clusters, please review and accept our Terms of Service and Privacy Policy.
        </p>

        <div className="w-full bg-[#161a22]/70 border border-white/[0.08] rounded-xl p-4 mb-6 text-left relative z-1">
          <Checkbox
            id="modal-agree-legal"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
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

        {error && (
          <div className="w-full p-3 bg-[#ef4444]/10 border border-[#ef4444]/25 text-[#f87171] rounded-xl text-xs mb-4 text-left">
            {error}
          </div>
        )}

        <Button
          onClick={handleAccept}
          disabled={!agreed || isSubmitting}
          isLoading={isSubmitting}
          variant="primary"
          className="w-full"
        >
          {isSubmitting ? 'Accepting...' : 'Accept & Continue'}
        </Button>
      </div>
    </div>
  );
}
