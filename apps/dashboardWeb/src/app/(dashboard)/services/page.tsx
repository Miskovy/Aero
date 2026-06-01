'use client';

import React, { useState } from 'react';

interface CloudService {
  id: string;
  name: string;
  type: 'gateway' | 'database' | 'static' | 'worker';
  status: 'running' | 'stopped' | 'deploying';
  uptime: string;
  endpoint: string;
}

export default function ServicesPage() {
  const [services] = useState<CloudService[]>([
    { id: 's1', name: 'aero-api-gateway', type: 'gateway', status: 'running', uptime: '14d 8h', endpoint: 'api.aero.dev' },
    { id: 's2', name: 'aero-postgres-db', type: 'database', status: 'running', uptime: '32d 12h', endpoint: 'db.internal:5432' },
    { id: 's3', name: 'aero-web-dashboard', type: 'static', status: 'running', uptime: '6d 21h', endpoint: 'console.aero.dev' },
    { id: 's4', name: 'image-processing-worker', type: 'worker', status: 'stopped', uptime: '0s', endpoint: 'worker.internal' }
  ]);

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              AERO CLOUD SERVICES
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Deploy and control containers, API proxies, database clusters, and persistent workers.
            </p>
          </div>
          <button className="nav-item active" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            NEW CLOUD SERVICE
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {services.map(service => (
            <div key={service.id} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {service.type}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{service.uptime}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{service.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>{service.endpoint}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{
                    backgroundColor: service.status === 'running' ? 'var(--accent-cyan)' : service.status === 'deploying' ? '#fbbf24' : '#ef4444',
                    boxShadow: `0 0 8px ${service.status === 'running' ? 'var(--accent-cyan)' : service.status === 'deploying' ? '#fbbf24' : '#ef4444'}`
                  }}></span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>{service.status}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="nav-item" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    LOGS
                  </button>
                  <button className="nav-item active" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    {service.status === 'running' ? 'RESTART' : 'START'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
