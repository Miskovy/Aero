'use client';

import React, { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  tier: 'Developer Tier' | 'Standard Tier' | 'Enterprise Tier';
  membersCount: number;
  projectsCount: number;
  status: 'Active' | 'Suspended';
}

const DEFAULT_ORGS: Organization[] = [
  { id: 'org-1', name: 'Core Infrastructure Org', tier: 'Enterprise Tier', membersCount: 8, projectsCount: 12, status: 'Active' },
  { id: 'org-2', name: 'Aero Dev Labs Team', tier: 'Developer Tier', membersCount: 3, projectsCount: 4, status: 'Active' }
];

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  
  // Inputs state
  const [orgName, setOrgName] = useState('');
  const [orgTier, setOrgTier] = useState<Organization['tier']>('Developer Tier');

  const API_BASE = '/api';

  // Extract Cookie helper
  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // 1. READ: Fetch all organizations
  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      // Connect to real backend
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
      setIsDemoMode(false);
    } catch (err: any) {
      console.warn('Backend connection failed, loading local state storage instead:', err.message);
      // Fallback to local storage for testability
      const localData = localStorage.getItem('aero_local_orgs');
      if (localData) {
        setOrgs(JSON.parse(localData));
      } else {
        setOrgs(DEFAULT_ORGS);
        localStorage.setItem('aero_local_orgs', JSON.stringify(DEFAULT_ORGS));
      }
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Save to local storage helper (in demo mode)
  const saveToLocal = (updatedOrgs: Organization[]) => {
    setOrgs(updatedOrgs);
    localStorage.setItem('aero_local_orgs', JSON.stringify(updatedOrgs));
  };

  // 2. CREATE: Submit new Organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    const token = getSessionToken();
    const payload = {
      name: orgName,
      tier: orgTier,
      membersCount: 1,
      projectsCount: 0,
      status: 'Active'
    };

    if (isDemoMode) {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name: orgName,
        tier: orgTier,
        membersCount: 1,
        projectsCount: 0,
        status: 'Active'
      };
      const updated = [...orgs, newOrg];
      saveToLocal(updated);
      closeModal();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create organization in backend');
      
      fetchOrganizations();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3. UPDATE: Rename organization
  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !orgName.trim()) return;

    const token = getSessionToken();
    
    if (isDemoMode) {
      const updated = orgs.map(o => o.id === selectedOrgId ? { ...o, name: orgName, tier: orgTier } : o);
      saveToLocal(updated);
      closeModal();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/organizations/${selectedOrgId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: orgName, tier: orgTier })
      });

      if (!res.ok) throw new Error('Failed to update organization in backend');
      
      fetchOrganizations();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 4. DELETE: Remove organization
  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action is permanent.')) return;

    const token = getSessionToken();

    if (isDemoMode) {
      const updated = orgs.filter(o => o.id !== id);
      saveToLocal(updated);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/organizations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete organization in backend');
      
      fetchOrganizations();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Modal open helpers
  const openCreateModal = () => {
    setModalMode('create');
    setOrgName('');
    setOrgTier('Developer Tier');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setModalMode('edit');
    setSelectedOrgId(org.id);
    setOrgName(org.name);
    setOrgTier(org.tier);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrgId(null);
    setOrgName('');
  };

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr', gap: '24px', position: 'relative' }}>
      <div className="metric-card">
        
        {/* Header Console */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                AERO TEAMS & ORGANIZATIONS
              </h2>
              {isDemoMode && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.08)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.15)', fontWeight: 600 }}>
                  ⚠️ OFFLINE DEMO MODE
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>
              Manage shared tenant spaces, collaborative memberships, and role permissions.
            </p>
          </div>
          <button 
            onClick={openCreateModal} 
            className="nav-item active" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            CREATE ORGANIZATION
          </button>
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
            <div style={{ marginBottom: '12px' }}>Connecting to cloud host data...</div>
            <span className="pulse-dot" style={{ display: 'inline-block', backgroundColor: 'var(--accent-cyan)' }}></span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {orgs.map(org => (
              <div key={org.id} className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {org.tier}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{org.status}</span>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{org.name}</h3>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>
                    <div>👥 {org.membersCount} {org.membersCount === 1 ? 'Member' : 'Members'}</div>
                    <div>⚡ {org.projectsCount} {org.projectsCount === 1 ? 'Stack' : 'Stacks'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <button 
                    onClick={() => openEditModal(org)} 
                    className="nav-item" 
                    style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    RENAME
                  </button>
                  <button 
                    onClick={() => handleDeleteOrg(org.id)} 
                    className="nav-item" 
                    style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', cursor: 'pointer' }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Frosted-Glass CRUD Modal ── */}
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
            maxWidth: '440px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {modalMode === 'create' ? 'CREATE NEW TEAM SPACE' : 'RENAME TEAM SPACE'}
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '24px' }}>
              Provide the organization credentials to authenticate with the orchestration system.
            </p>

            <form onSubmit={modalMode === 'create' ? handleCreateOrg : handleUpdateOrg}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Organization Name
                </label>
                <input 
                  type="text" 
                  value={orgName} 
                  onChange={e => setOrgName(e.target.value)} 
                  placeholder="e.g. Acme Corporation" 
                  required
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Subscription Tier
                </label>
                <select 
                  value={orgTier} 
                  onChange={e => setOrgTier(e.target.value as Organization['tier'])}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Developer Tier">Developer Tier</option>
                  <option value="Standard Tier">Standard Tier</option>
                  <option value="Enterprise Tier">Enterprise Tier</option>
                </select>
              </div>

              {error && (
                <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '12px', marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="nav-item" 
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="nav-item active" 
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  {modalMode === 'create' ? 'PROCEED' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
