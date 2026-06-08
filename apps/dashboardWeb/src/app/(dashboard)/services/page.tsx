'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
}

interface CloudService {
  id: string;
  name: string;
  slug: string;
  type: 'application' | 'database' | 'cache' | 'queue' | 'static' | 'custom';
  status: 'running' | 'stopped' | 'deploying' | 'building' | 'failed' | 'degraded';
  created_at: string;
  project?: Project;
  git_repository?: string;
  internal_port?: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<CloudService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const router = useRouter();

  const API_BASE = '/api';

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Fetch all services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      setServices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchServices();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchServices]);

  // Service Actions (Start / Stop / Restart) — sends command to connected node agent
  const handleServiceAction = async (serviceId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoadingId(serviceId);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to ${action} service`);
      }

      await fetchServices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('npm install -g aerodeploy');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // Error State
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

  // Empty State — guides user to install CLI
  const renderEmptyState = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '56px 24px',
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px dashed var(--border-glass)',
      borderRadius: '8px',
      textAlign: 'center',
      maxWidth: '520px',
      margin: '40px auto',
    }}>
      {/* Terminal icon */}
      <svg style={{ color: 'var(--text-dim)', marginBottom: '20px' }} width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        NO SERVICES YET
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px', maxWidth: '400px' }}>
        Services are deployed from your hardware using the Aero CLI. Install the CLI on your machine, connect it as a node, and deploy your first service.
      </p>

      {/* Install command */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-glass)',
        borderRadius: '6px',
        padding: '10px 16px',
        marginBottom: '16px',
        width: '100%',
        maxWidth: '340px',
      }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '13px', userSelect: 'none' }}>$</span>
        <code style={{ 
          flex: 1, 
          fontSize: '13px', 
          fontFamily: 'var(--font-mono)', 
          color: 'var(--accent-cyan)',
          userSelect: 'all'
        }}>
          npm install -g aerodeploy
        </code>
        <button
          onClick={handleCopyInstall}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: copiedCmd ? 'var(--accent-green)' : 'var(--text-dim)',
            transition: 'color 0.2s ease',
            width: 'auto',
          }}
          title="Copy to clipboard"
        >
          {copiedCmd ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          )}
        </button>
      </div>

      <button
        onClick={() => setShowGuide(true)}
        className="nav-item"
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-dim)' }}
      >
        View Setup Guide
      </button>
    </div>
  );

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
      <div className="metric-card">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              DEPLOYED SERVICES
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Monitor and manage services running on your connected nodes.
            </p>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="nav-item active" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            HOW TO DEPLOY
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '80px 0' 
          }}>
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
          renderError(error, fetchServices)
        ) : services.length === 0 ? (
          renderEmptyState()
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {services.map(service => {
              const isActionRunning = actionLoadingId === service.id;
              
              let statusColor = '#ef4444';
              if (service.status === 'running') statusColor = 'var(--accent-cyan)';
              else if (service.status === 'deploying' || service.status === 'building') statusColor = '#fbbf24';
              else if (service.status === 'stopped') statusColor = 'var(--text-dim)';
              
              return (
                <div key={service.id} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {service.type}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        Project: {service.project?.name || 'Unknown'}
                      </span>
                    </div>

                    <h3 onClick={() => router.push(`/services/${service.id}`)} style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', cursor: 'pointer', transition: 'color 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-cyan)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}>{service.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '20px', wordBreak: 'break-all' }}>
                      {service.slug}.aerodeploy.app
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-dot" style={{
                        backgroundColor: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`
                      }}></span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>{service.status}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {service.status === 'running' ? (
                        <>
                          <button 
                            disabled={isActionRunning}
                            onClick={() => handleServiceAction(service.id, 'stop')}
                            className="nav-item" 
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.05)', color: '#f87171', cursor: isActionRunning ? 'not-allowed' : 'pointer' }}
                          >
                            {isActionRunning ? '...' : 'STOP'}
                          </button>
                          <button 
                            disabled={isActionRunning}
                            onClick={() => handleServiceAction(service.id, 'restart')}
                            className="nav-item active" 
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: isActionRunning ? 'not-allowed' : 'pointer' }}
                          >
                            {isActionRunning ? '...' : 'RESTART'}
                          </button>
                        </>
                      ) : (
                        <button 
                          disabled={isActionRunning || service.status === 'deploying' || service.status === 'building'}
                          onClick={() => handleServiceAction(service.id, 'start')}
                          className="nav-item active" 
                          style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: (isActionRunning || service.status === 'deploying' || service.status === 'building') ? 'not-allowed' : 'pointer' }}
                        >
                          {isActionRunning ? '...' : 'START'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CLI Setup Guide Modal ── */}
      {showGuide && (
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
            maxWidth: '540px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  DEPLOY WITH CLI
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  Deploy services directly from your machine to your connected nodes.
                </p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                  width: 'auto',
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)',
                  flexShrink: 0,
                }}>1</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Install the Aero CLI
                  </p>
                  <div style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px', userSelect: 'none' }}>$</span>
                    <code style={{ flex: 1, fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      npm install -g aerodeploy
                    </code>
                    <button
                      onClick={handleCopyInstall}
                      style={{
                        background: 'transparent', border: 'none', padding: '4px',
                        cursor: 'pointer', width: 'auto',
                        color: copiedCmd ? 'var(--accent-green)' : 'var(--text-dim)',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {copiedCmd ? (
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)',
                  flexShrink: 0,
                }}>2</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Authenticate your account
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                    Run <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '12px' }}>aero login</code> to connect the CLI to your Aero account.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)',
                  flexShrink: 0,
                }}>3</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Register your machine as a node
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                    Your PC or server becomes a deployment target. Connect it using the interactive setup in the CLI.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)',
                  flexShrink: 0,
                }}>4</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Create and deploy a service
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                    Run <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '12px' }}>aero create</code> to set up a new service from a GitHub repo or Docker image. Once deployed, it will appear here for monitoring.
                  </p>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px solid var(--border-glass)', margin: '24px 0 16px' }} />

            <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.5', textAlign: 'center' }}>
              Once your services are deployed via the CLI, you can start, stop, restart, and observe them from this dashboard.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setShowGuide(false)}
                className="nav-item active" 
                style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
