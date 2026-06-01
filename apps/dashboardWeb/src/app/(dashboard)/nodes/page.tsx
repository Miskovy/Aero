'use client';

import React, { useState } from 'react';

interface NodeItem {
  id: string;
  name: string;
  ip: string;
  cpu: number;
  memory: number;
  disk: string;
  status: 'online' | 'offline' | 'degraded';
  region: string;
}

export default function NodesPage() {
  const [nodes] = useState<NodeItem[]>([
    { id: 'n1', name: 'fra-node-core-01', ip: '138.197.80.45', cpu: 14, memory: 42, disk: '38%', status: 'online', region: 'Frankfurt, DE' },
    { id: 'n2', name: 'nyc-node-edge-02', ip: '159.203.170.82', cpu: 28, memory: 58, disk: '62%', status: 'online', region: 'New York, US' },
    { id: 'n3', name: 'ams-node-db-01', ip: '142.93.220.101', cpu: 8, memory: 74, disk: '82%', status: 'online', region: 'Amsterdam, NL' },
    { id: 'n4', name: 'sgp-node-backup', ip: '128.199.160.12', cpu: 0, memory: 0, disk: '0%', status: 'offline', region: 'Singapore, SG' }
  ]);

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              AERO PHYSICAL NODES
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Manage and monitor host server nodes connected to the Aero orchestration network.
            </p>
          </div>
          <button className="nav-item active" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            CONNECT NEW NODE
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '12px 16px' }}>NAME</th>
                <th style={{ padding: '12px 16px' }}>REGION</th>
                <th style={{ padding: '12px 16px' }}>IP ADDRESS</th>
                <th style={{ padding: '12px 16px' }}>CPU</th>
                <th style={{ padding: '12px 16px' }}>MEMORY</th>
                <th style={{ padding: '12px 16px' }}>DISK</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => (
                <tr key={node.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>{node.name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-dim)' }}>{node.region}</td>
                  <td style={{ padding: '16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{node.ip}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{node.status === 'offline' ? '-' : `${node.cpu}%`}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{node.status === 'offline' ? '-' : `${node.memory}%`}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{node.status === 'offline' ? '-' : node.disk}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-dot" style={{
                        backgroundColor: node.status === 'online' ? 'var(--accent-cyan)' : node.status === 'degraded' ? '#fbbf24' : '#ef4444',
                        boxShadow: `0 0 8px ${node.status === 'online' ? 'var(--accent-cyan)' : node.status === 'degraded' ? '#fbbf24' : '#ef4444'}`
                      }}></span>
                      <span style={{
                        color: node.status === 'online' ? 'var(--text-primary)' : 'var(--text-dim)',
                        fontWeight: 500,
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>{node.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
