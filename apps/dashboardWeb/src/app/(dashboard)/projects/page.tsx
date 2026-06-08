'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CustomSelect from '../../../components/CustomSelect';

interface Organization {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  _count?: {
    services: number;
  };
}

export default function ProjectsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

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

      const data = await res.json();
      setOrgs(data);

      if (data.length > 0) {
        // Retrieve last active org or default to first
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

  // Fetch projects for current organization
  const fetchProjects = useCallback(async (orgId: string) => {
    setProjectsLoading(true);
    setProjectsError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/projects?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      setProjects(data);
    } catch (err: unknown) {
      setProjectsError(err instanceof Error ? err.message : String(err));
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchProjects(selectedOrgId);
    }
  }, [selectedOrgId, fetchProjects]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('aero_active_org_id', orgId);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedOrgId) return;

    setCreateLoading(true);
    setCreateError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId: selectedOrgId,
          name: newProjectName
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create project on the server');
      }

      setNewProjectName('');
      setIsModalOpen(false);
      fetchProjects(selectedOrgId);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        NO PROJECTS DETECTED
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
        This organization has no deployment projects configured. Create one to begin.
      </p>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="nav-item active" 
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
      >
        CREATE FIRST PROJECT
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
              AERO DEPLOYED PROJECTS
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              Create, configure, and compile software stack clusters and static assets.
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
              onClick={() => setIsModalOpen(true)}
              disabled={!selectedOrgId}
              className="nav-item active" 
              style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: selectedOrgId ? 'pointer' : 'not-allowed', opacity: selectedOrgId ? 1 : 0.5 }}
            >
              NEW DEPLOYMENT PROJECT
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
        ) : projectsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div className="throbber" />
          </div>
        ) : projectsError ? (
          renderError(projectsError, () => fetchProjects(selectedOrgId))
        ) : projects.length === 0 ? (
          renderEmptyState()
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {projects.map((proj) => (
              <div key={proj.id} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {proj.slug}
                    </span>
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Active</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{proj.name}</h3>
                  {proj.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.4 }}>{proj.description}</p>
                  )}
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                    Created: <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px' }}>
                      {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                  <span>{proj._count?.services ?? 0} { (proj._count?.services === 1) ? 'service' : 'services' } configured</span>
                  <button className="nav-item active" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    OPEN STACK
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Project Modal ── */}
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
            maxWidth: '440px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              CREATE NEW PROJECT
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '24px' }}>
              Specify a name for your software stack cluster. Slugs are auto-generated.
            </p>

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Project Name
                </label>
                <input 
                  type="text" 
                  value={newProjectName} 
                  onChange={e => setNewProjectName(e.target.value)} 
                  placeholder="e.g. Acme Web App" 
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
                  disabled={createLoading || !newProjectName.trim()}
                  className="nav-item active" 
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', opacity: (createLoading || !newProjectName.trim()) ? 0.5 : 1 }}
                >
                  {createLoading ? 'CREATING...' : 'PROCEED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

