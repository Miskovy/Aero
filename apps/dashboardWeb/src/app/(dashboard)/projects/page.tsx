'use client';

import React from 'react';

export default function ProjectsPage() {
  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              AERO DEPLOYED PROJECTS
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Create, configure, and compile software stack clusters and static assets.
            </p>
          </div>
          <button className="nav-item active" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            NEW DEPLOYMENT PROJECT
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[
            { name: 'aero-auth-server', repo: 'github:aero/auth-server', branch: 'main', deploys: '18 successful', status: 'Healthy' },
            { name: 'aero-dashboard-frontend', repo: 'github:aero/dashboard-frontend', branch: 'release-v1', deploys: '32 successful', status: 'Healthy' },
            { name: 'aero-worker-analytics', repo: 'github:aero/worker-analytics', branch: 'master', deploys: '9 successful', status: 'Healthy' }
          ].map((proj, idx) => (
            <div key={idx} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {orgRepoDisplay(proj.repo)}
                </span>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>{proj.status}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{proj.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Branch: <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px' }}>{proj.branch}</span></p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                <span>{proj.deploys}</span>
                <button className="nav-item active" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  BUILD NOW
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function orgRepoDisplay(repo: string) {
  return repo.split(':')[1];
}
