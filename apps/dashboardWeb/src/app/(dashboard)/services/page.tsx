'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Organization {
  id: string;
  name: string;
}

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
}

export default function ServicesPage() {
  const [services, setServices] = useState<CloudService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal / Creation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sourceType, setSourceType] = useState<'git' | 'docker_image'>('git');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [dockerImage, setDockerImage] = useState('');
  const [internalPort, setInternalPort] = useState<number>(3000);
  
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    fetchServices();
  }, [fetchServices]);

  // Fetch organizations when modal opens
  const loadOrganizations = async () => {
    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data);
        if (data.length > 0) {
          const savedOrgId = localStorage.getItem('aero_active_org_id');
          const exists = data.some((o: Organization) => o.id === savedOrgId);
          const activeId = exists ? savedOrgId : data[0].id;
          setSelectedOrgId(activeId || '');
          loadProjects(activeId || '');
        }
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  const loadProjects = async (orgId: string) => {
    if (!orgId) return;
    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/projects?orgId=${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        } else {
          setSelectedProjectId('');
        }
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    loadProjects(orgId);
  };

  // Service Actions (Start / Stop / Restart)
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

      // Re-fetch list to show updated status
      await fetchServices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create Service Handler
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setCreateError('Please select a project first');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    const token = getSessionToken();

    const payload = {
      projectId: selectedProjectId,
      sourceType,
      repo: sourceType === 'git' ? repo : undefined,
      branch: sourceType === 'git' ? branch : undefined,
      dockerImage: sourceType === 'docker_image' ? dockerImage : undefined,
      internalPort: Number(internalPort) || 3000
    };

    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create service');
      }

      setIsModalOpen(false);
      setRepo('');
      setDockerImage('');
      fetchServices();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
  };

  const openNewServiceModal = () => {
    setIsModalOpen(true);
    loadOrganizations();
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
      </svg>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        NO SERVICES DEPLOYED
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
        You haven't deployed any active software stack containers. Create a new service to launch.
      </p>
      <button 
        onClick={openNewServiceModal}
        className="nav-item active" 
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
      >
        DEPLOY FIRST SERVICE
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
              AERO CLOUD SERVICES
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Deploy and control containers, API proxies, database clusters, and persistent workers.
            </p>
          </div>
          <button 
            onClick={openNewServiceModal}
            className="nav-item active" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            NEW CLOUD SERVICE
          </button>
        </div>

        {/* Content Container */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            <div style={{ marginBottom: '12px' }}>Connecting to cloud database...</div>
            <span className="pulse-dot" style={{ display: 'inline-block', backgroundColor: 'var(--accent-cyan)' }}></span>
          </div>
        ) : error ? (
          renderError(error, fetchServices)
        ) : services.length === 0 ? (
          renderEmptyState()
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {services.map(service => {
              const isActionRunning = actionLoadingId === service.id;
              
              // Status Colors mapping
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

                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{service.name}</h3>
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

      {/* ── Create Service Modal ── */}
      {isModalOpen && (
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
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              DEPLOY NEW CLOUD SERVICE
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '24px' }}>
              Select target project and code source to compile and run your container stack.
            </p>

            <form onSubmit={handleCreateService}>
              {/* Org & Project dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Organization
                  </label>
                  <select 
                    value={selectedOrgId} 
                    onChange={(e) => handleOrgChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select Organization</option>
                    {orgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Project Target
                  </label>
                  <select 
                    value={selectedProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select Project</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Type selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Deployment Source
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setSourceType('git')}
                    className={`nav-item ${sourceType === 'git' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '12px' }}
                  >
                    Git Repository
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSourceType('docker_image')}
                    className={`nav-item ${sourceType === 'docker_image' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '12px' }}
                  >
                    Docker Image
                  </button>
                </div>
              </div>

              {/* Source-specific fields */}
              {sourceType === 'git' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                      GitHub Repository
                    </label>
                    <input 
                      type="text" 
                      value={repo} 
                      onChange={e => setRepo(e.target.value)} 
                      placeholder="e.g. aero/auth-server" 
                      required
                      disabled={createLoading}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        padding: '10px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                      Branch
                    </label>
                    <input 
                      type="text" 
                      value={branch} 
                      onChange={e => setBranch(e.target.value)} 
                      placeholder="main" 
                      required
                      disabled={createLoading}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '4px',
                        padding: '10px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Docker Image Reference
                  </label>
                  <input 
                    type="text" 
                    value={dockerImage} 
                    onChange={e => setDockerImage(e.target.value)} 
                    placeholder="e.g. library/nginx:alpine" 
                    required
                    disabled={createLoading}
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {/* Port details */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Internal Service Port
                </label>
                <input 
                  type="number" 
                  value={internalPort} 
                  onChange={e => setInternalPort(Number(e.target.value))} 
                  required
                  disabled={createLoading}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '4px',
                    padding: '10px',
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
                  onClick={() => { setIsModalOpen(false); setCreateError(null); }} 
                  disabled={createLoading}
                  className="nav-item" 
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  disabled={createLoading}
                  className="nav-item active" 
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', opacity: createLoading ? 0.5 : 1 }}
                >
                  {createLoading ? 'DEPLOYING...' : 'LAUNCH SERVICE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

