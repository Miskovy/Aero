'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CustomSelect from '../../../components/CustomSelect';

interface Organization {
  id: string;
  name: string;
}

interface SystemInfo {
  region?: string;
  [key: string]: unknown;
}

interface ResourceUsage {
  cpu?: number;
  loadavg?: number[];
  memory?: number;
  totalmem?: number | string;
  freemem?: number | string;
  disk?: string;
  [key: string]: unknown;
}

interface NodeItem {
  id: string;
  name: string;
  hostname: string;
  ip_address?: string;
  status: 'online' | 'offline' | 'draining' | 'maintenance';
  system_info?: SystemInfo;
  resource_usage?: ResourceUsage;
  last_heartbeat_at?: string;
}

export default function NodesPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodesError, setNodesError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeHostname, setNodeHostname] = useState('');
  const [nodeIp, setNodeIp] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Registration Success details
  const [registeredToken, setRegisteredToken] = useState<string | null>(null);

  // Delete node states
  const [nodeToDelete, setNodeToDelete] = useState<NodeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const API_BASE = '/api';

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Fetch all organizations
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      setOrgs(data);

      if (data.length > 0) {
        const savedOrgId = localStorage.getItem('aero_active_org_id');
        const exists = data.some((o: Organization) => o.id === savedOrgId);
        const activeId = exists ? savedOrgId : data[0].id;
        setSelectedOrgId(activeId);
        if (activeId) {
          localStorage.setItem('aero_active_org_id', activeId);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch nodes for active organization
  const fetchNodes = useCallback(async (orgId: string, silent = false) => {
    if (!silent) {
      setNodesLoading(true);
      setNodesError(null);
    }
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/nodes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      setNodes(data);
    } catch (err: unknown) {
      if (!silent) {
        setNodesError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!silent) {
        setNodesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchOrganizations();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchOrganizations]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active && selectedOrgId) {
        fetchNodes(selectedOrgId, false);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedOrgId, fetchNodes]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('aero_active_org_id', orgId);
  };

  const handleConnectNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim() || !nodeHostname.trim() || !selectedOrgId) return;

    setCreateLoading(true);
    setCreateError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations/${selectedOrgId}/nodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nodeName,
          hostname: nodeHostname,
          ip_address: nodeIp.trim() || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Failed to register node with server');
      }

      const createdNode = await res.json();
      setRegisteredToken(createdNode.agent_token);

      // Reset inputs
      setNodeName('');
      setNodeHostname('');
      setNodeIp('');

      fetchNodes(selectedOrgId);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete || !selectedOrgId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations/${selectedOrgId}/nodes/${nodeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to revoke node');
      }

      setNodeToDelete(null);
      fetchNodes(selectedOrgId);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeConnectModal = () => {
    setIsModalOpen(false);
    setRegisteredToken(null);
    setCreateError(null);
  };

  // Error State Render Helper
  const renderError = (msg: string, retryFn: () => void) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      background: 'rgba(239, 68, 68, 0.02)',
      border: '1px dashed rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '40px auto',
    }}>
      <svg style={{ color: '#f87171', marginBottom: '16px' }} width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f87171', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        OH SNAP!
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
        There might be a problem in our servers. {msg}
      </p>
      <button
        onClick={retryFn}
        className="nav-item active"
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
      >
        Retry Connection
      </button>
    </div>
  );

  // Empty State Render Helper
  const renderEmptyState = () => (
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
      maxWidth: '480px',
      margin: '40px auto',
    }}>
      <svg style={{ color: 'var(--text-dim)', marginBottom: '16px' }} width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a3 3 0 003 3m13.5-3a3 3 0 003 3m-3-3V7.5a3 3 0 00-3-3h-7.5a3 3 0 00-3 3v3.75" />
      </svg>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        NO NODES CONNECTED
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
        No host servers are associated with this cluster. Register a new node to begin deploying workloads.
      </p>
      <button
        onClick={() => setIsModalOpen(true)}
        className="nav-item active"
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
      >
        CONNECT FIRST NODE
      </button>
    </div>
  );

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">

        {/* Header Console */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              AERO PHYSICAL NODES
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Manage and monitor host server nodes connected to the Aero orchestration network.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {orgs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>ORGANIZATION</span>
                <CustomSelect
                  value={selectedOrgId || ''}
                  onChange={handleOrgChange}
                  options={orgs.map(org => ({ value: org.id, label: org.name }))}
                  style={{ width: '180px' }}
                />
              </div>
            )}

            <button
              onClick={() => selectedOrgId && fetchNodes(selectedOrgId, false)}
              disabled={!selectedOrgId || nodesLoading}
              className="nav-item"
              style={{
                width: 'auto',
                padding: '8px 16px',
                fontSize: '12px',
                border: '1px solid var(--border-glass)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: (selectedOrgId && !nodesLoading) ? 'pointer' : 'not-allowed',
                opacity: selectedOrgId ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg 
                width="13" 
                height="13" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  transformOrigin: 'center',
                  animation: nodesLoading ? 'spin 1s linear infinite' : 'none'
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              REFRESH
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!selectedOrgId}
              className="nav-item active"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: selectedOrgId ? 'pointer' : 'not-allowed', opacity: selectedOrgId ? 1 : 0.5 }}
            >
              CONNECT NEW NODE
            </button>
          </div>
        </div>

        {/* Content Container */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .throbber {
                width: 36px;
                height: 36px;
                border: 3px solid rgba(56, 189, 248, 0.1);
                border-top: 3px solid var(--accent-cyan, #38bdf8);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }
            `}</style>
            <div className="throbber" />
          </div>
        ) : error ? (
          renderError(error, fetchOrganizations)
        ) : !selectedOrgId ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
            No organization selected or associated with this user account.
          </div>
        ) : nodesLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div className="throbber" />
          </div>
        ) : nodesError ? (
          renderError(nodesError, () => fetchNodes(selectedOrgId))
        ) : nodes.length === 0 ? (
          renderEmptyState()
        ) : (
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
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  const region = node.system_info?.region || 'Self-Hosted';
                  
                  let cpuVal = '-';
                  if (node.status !== 'offline') {
                    if (node.resource_usage?.cpu !== undefined) {
                      cpuVal = `${node.resource_usage.cpu}%`;
                    } else if (node.resource_usage?.loadavg && Array.isArray(node.resource_usage.loadavg) && node.resource_usage.loadavg.length > 0) {
                      cpuVal = `${node.resource_usage.loadavg[0].toFixed(2)} (load)`;
                    }
                  }

                  let memoryVal = '-';
                  if (node.status !== 'offline') {
                    if (node.resource_usage?.memory !== undefined) {
                      memoryVal = `${node.resource_usage.memory}%`;
                    } else if (node.resource_usage?.totalmem && node.resource_usage?.freemem) {
                      const total = Number(node.resource_usage.totalmem);
                      const free = Number(node.resource_usage.freemem);
                      if (total > 0) {
                        const used = total - free;
                        const pct = Math.round((used / total) * 100);
                        memoryVal = `${pct}%`;
                      }
                    }
                  }

                  const disk = node.resource_usage?.disk ?? 'N/A';

                  return (
                    <tr key={node.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <a href={`/nodes/${node.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-cyan)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>
                          {node.name}
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            {node.hostname}
                          </span>
                        </a>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-dim)' }}>{region}</td>
                      <td style={{ padding: '16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{node.ip_address || 'N/A'}</td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{cpuVal}</td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{memoryVal}</td>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{node.status === 'offline' ? '-' : disk}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pulse-dot" style={{
                            backgroundColor: node.status === 'online' ? '#22c55e' : node.status === 'offline' ? '#ffffff' : '#fbbf24',
                            boxShadow: `0 0 8px ${node.status === 'online' ? '#22c55e' : node.status === 'offline' ? '#ffffff' : '#fbbf24'}`
                          }}></span>
                          <span style={{
                            color: node.status === 'online' ? '#22c55e' : node.status === 'offline' ? '#ffffff' : '#fbbf24',
                            fontWeight: 500,
                            fontSize: '12px',
                            textTransform: 'uppercase'
                          }}>{node.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setNodeToDelete(node)}
                          className="nav-item"
                          style={{
                            width: 'auto',
                            padding: '6px 12px',
                            fontSize: '11px',
                            border: '1px solid rgba(239,68,68,0.15)',
                            background: 'rgba(239,68,68,0.05)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'inline-block'
                          }}
                        >
                          REVOKE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Connect Node Modal ── */}
      {isModalOpen && selectedOrgId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="metric-card" style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            {!registeredToken ? (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  CONNECT NEW SERVER NODE
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '24px' }}>
                  Provide the target node details. This creates a secure registration profile in your cluster.
                </p>

                <form onSubmit={handleConnectNode}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Node Alias
                      </label>
                      <input
                        type="text"
                        value={nodeName}
                        onChange={e => setNodeName(e.target.value)}
                        placeholder="e.g. fra-node-01"
                        required
                        disabled={createLoading}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '4px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Hostname
                      </label>
                      <input
                        type="text"
                        value={nodeHostname}
                        onChange={e => setNodeHostname(e.target.value)}
                        placeholder="e.g. host.internal"
                        required
                        disabled={createLoading}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '4px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                      IP Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={nodeIp}
                      onChange={e => setNodeIp(e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      disabled={createLoading}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {createError && (
                    <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '12px', marginBottom: '20px' }}>
                      {createError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={closeConnectModal}
                      disabled={createLoading}
                      className="nav-item"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !nodeName.trim() || !nodeHostname.trim()}
                      className="nav-item active"
                      style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', opacity: (createLoading || !nodeName.trim() || !nodeHostname.trim()) ? 0.5 : 1 }}
                    >
                      {createLoading ? 'REGISTERING...' : 'REGISTER NODE'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <svg style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }} width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    NODE REGISTERED SUCCESSFULLY
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5' }}>
                    Use this pairing token to register and launch the Aero Node daemon agent on your host machine.
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Secure Agent Token
                  </label>
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--accent-cyan)',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      flex: 1,
                      scrollbarWidth: 'none'
                    }}>
                      {registeredToken}
                    </span>
                    <button
                      onClick={() => {
                        if (registeredToken) {
                          navigator.clipboard.writeText(registeredToken);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 'auto'
                      }}
                      title="Copy to clipboard"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aero Agent Command
                  </label>
                  <pre style={{
                    background: '#09090b',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '4px',
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    overflowX: 'auto',
                    margin: 0
                  }}>
                    aero-agent --token {registeredToken}
                  </pre>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeConnectModal}
                    className="nav-item active"
                    style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    DONE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Delete Node Confirmation Modal ── */}
      {nodeToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="metric-card" style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <svg style={{ color: '#ef4444', marginBottom: '16px' }} width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              REVOKE NODE ACCESS?
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to revoke access for node <strong>{nodeToDelete.name}</strong> ({nodeToDelete.hostname})?
              This node will be disconnected from the cluster, and any services running on it will stop exposing workloads.
            </p>

            {deleteError && (
              <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '12px', marginBottom: '20px', textAlign: 'left' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { setNodeToDelete(null); setDeleteError(null); }}
                disabled={deleteLoading}
                className="nav-item"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDeleteNode}
                disabled={deleteLoading}
                className="nav-item active"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer' }}
              >
                {deleteLoading ? 'REVOKING...' : 'CONFIRM REVOKE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

