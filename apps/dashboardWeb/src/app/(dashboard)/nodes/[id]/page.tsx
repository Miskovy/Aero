'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import SshTerminal from '../../../../components/SshTerminal';

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  internal_port: number;
}

interface NodeDetails {
  id: string;
  name: string;
  hostname: string;
  ip_address?: string;
  status: string;
  role: string;
  system_info?: any;
  resource_usage?: any;
  services?: ServiceItem[];
  organization_id: string;
}

export default function NodeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [node, setNode] = useState<NodeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'terminal'>('overview');
  const [sessionToken, setSessionToken] = useState<string>('');

  const API_BASE = '/api';

  useEffect(() => {
    params.then((p) => setNodeId(p.id));
  }, [params]);

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchNode = useCallback(async () => {
    if (!nodeId) return;
    setLoading(true);
    setError(null);
    const token = getSessionToken();
    if (token) setSessionToken(token);

    try {
      const orgId = localStorage.getItem('aero_active_org_id');
      if (!orgId) throw new Error('No active organization selected');

      const res = await fetch(`${API_BASE}/organizations/${orgId}/nodes/${nodeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      setNode(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load node details');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNode();
  }, [fetchNode]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .throbber { width: 36px; height: 36px; border: 3px solid rgba(56, 189, 248, 0.1); border-top: 3px solid var(--accent-cyan, #38bdf8); border-radius: 50%; animation: spin 0.8s linear infinite; }
        `}</style>
        <div className="throbber" />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="metric-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Node</h3>
        <p style={{ color: 'var(--text-dim)' }}>{error}</p>
        <button onClick={() => router.push('/nodes')} className="nav-item active" style={{ marginTop: '20px', padding: '8px 16px', background: 'var(--bg-tertiary)' }}>
          Back to Nodes
        </button>
      </div>
    );
  }

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => router.push('/nodes')}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                title="Back to Nodes"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
                {node.name}
              </h2>
              <span className="pulse-dot" style={{
                backgroundColor: node.status === 'online' ? 'var(--accent-cyan)' : '#ef4444',
                boxShadow: `0 0 8px ${node.status === 'online' ? 'var(--accent-cyan)' : '#ef4444'}`,
                display: 'inline-block',
                marginLeft: '4px'
              }}></span>
              <span style={{ color: 'var(--text-dim)', fontSize: '13px', marginLeft: '8px' }}>
                {node.hostname} • {node.ip_address || 'No IP'} • {node.role.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px' }}>
          {(['overview', 'services', 'terminal'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-dim)',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>System Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-dim)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform:</span> <span style={{ color: 'var(--text-primary)' }}>{node.system_info?.platform || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Architecture:</span> <span style={{ color: 'var(--text-primary)' }}>{node.system_info?.arch || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CPUs:</span> <span style={{ color: 'var(--text-primary)' }}>{node.system_info?.cpus || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Region:</span> <span style={{ color: 'var(--text-primary)' }}>{node.system_info?.region || 'Self-Hosted'}</span></div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>Resource Usage</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-dim)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CPU Usage:</span> <span style={{ color: 'var(--text-primary)' }}>{node.resource_usage?.cpu !== undefined ? `${node.resource_usage.cpu}%` : 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Memory Usage:</span> <span style={{ color: 'var(--text-primary)' }}>{node.resource_usage?.memory !== undefined ? `${node.resource_usage.memory}%` : 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Disk Usage:</span> <span style={{ color: 'var(--text-primary)' }}>{node.resource_usage?.disk || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Load Average:</span> <span style={{ color: 'var(--text-primary)' }}>{node.resource_usage?.loadavg ? node.resource_usage.loadavg.map((n: number) => n.toFixed(2)).join(', ') : 'N/A'}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div>
              {node.services && node.services.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '12px 16px' }}>SERVICE NAME</th>
                      <th style={{ padding: '12px 16px' }}>SLUG</th>
                      <th style={{ padding: '12px 16px' }}>PORT</th>
                      <th style={{ padding: '12px 16px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {node.services.map(svc => (
                      <tr key={svc.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>{svc.name}</td>
                        <td style={{ padding: '16px', color: 'var(--text-dim)' }}>{svc.slug}</td>
                        <td style={{ padding: '16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{svc.internal_port}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: svc.status === 'running' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: svc.status === 'running' ? 'var(--accent-cyan)' : '#ef4444'
                          }}>
                            {svc.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
                  No services deployed on this node yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'terminal' && (
            <div style={{ height: '500px', width: '100%' }}>
              {sessionToken ? (
                <SshTerminal nodeId={node.id} token={sessionToken} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                  Authenticating terminal session...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
