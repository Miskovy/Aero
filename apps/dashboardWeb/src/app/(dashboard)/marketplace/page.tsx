'use client';

import React from 'react';

export default function MarketplacePage() {
  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            AERO CLUSTER MARKETPLACE
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
            Explore and deploy pre-configured database engines, edge cache clusters, and container setups with a single click.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            { name: 'Managed PostgreSQL Cluster', desc: 'High-availability persistent relational database with automatic backups.', version: 'v16.2', type: 'Database' },
            { name: 'Redis Edge Cache Store', desc: 'Ultra-low latency in-memory data store for live session caching.', version: 'v7.2', type: 'Cache Store' },
            { name: 'Nginx Ingress Reverse Proxy', desc: 'Secure traffic load balancer with automatic SSL certificate management.', version: 'v1.25', type: 'Ingress' },
            { name: 'Node.js Microservice Core', desc: 'Optimized workspace boilerplate for NestJS and Fastify services.', version: 'v20.11', type: 'Boilerplate' }
          ].map((item, idx) => (
            <div key={idx} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600 }}>{item.type}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{item.version}</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{item.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.4, marginBottom: '20px' }}>{item.desc}</p>
              <button className="nav-item active" style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                DEPLOY TO ACTIVE CLUSTER
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
