'use client';

import React from 'react';

export default function WebhooksPage() {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>Webhooks</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '32px' }}>
        Configure webhook endpoints to receive real-time event notifications from your deployments.
      </p>

      <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>WEBHOOK ENDPOINTS</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Subscribe to deployment, service, and node lifecycle events via HTTP callbacks.</p>
          </div>
          <button style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>
            + NEW WEBHOOK
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed var(--border-glass)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <svg style={{ color: 'var(--text-dim)', marginBottom: '16px' }} width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.193-9.193a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
          </svg>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            NO WEBHOOKS CONFIGURED
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', maxWidth: '340px' }}>
            Create a webhook endpoint to start receiving real-time push notifications for deployment events, service status changes, and infrastructure alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
