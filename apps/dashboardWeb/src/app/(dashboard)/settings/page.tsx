'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            CONSOLE SETTINGS
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
            Configure active API credentials, SSH keys, network firewalls, and deployment integrations.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>API Gateway URL</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>The active server address your web dashboard queries to synchronize state.</p>
            <input 
              type="text" 
              defaultValue="https://aero-y6mm.onrender.com" 
              style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '4px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}
              readOnly
            />
          </div>

          <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Active SSH Keys</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>Authenticate and deploy to remote nodes securely using public SSH keys.</p>
            <button className="nav-item active" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              ADD NEW SSH KEY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
