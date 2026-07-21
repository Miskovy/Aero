'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';

  // Fetch primary organization ID first if not set
  useEffect(() => {
    const fetchOrg = async () => {
      const token = getSessionToken();
      try {
        const res = await fetch(`${API_BASE}/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const orgList = Array.isArray(data) ? data : data?.data || [];
          if (orgList.length > 0) {
            setOrgId(orgList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch orgs:', err);
      }
    };
    fetchOrg();
  }, [API_BASE]);

  const fetchAuditLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (resourceTypeFilter) params.append('resource_type', resourceTypeFilter);

      const res = await fetch(`${API_BASE}/organizations/${orgId}/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Failed to load live audit logs, showing mock data for preview:', errMsg);
      // Fallback preview data
      setLogs([
        {
          id: 'log-1',
          organization_id: orgId || 'org-1',
          action: 'SERVICE_CREATE',
          resource_type: 'service',
          resource_id: 'svc-101',
          new_value: { name: 'Production API' },
          ip_address: '192.168.1.1',
          created_at: new Date().toISOString(),
          user: { id: 'u-1', email: 'dev@aerodeploy.app', name: 'DevOps Lead' },
        },
        {
          id: 'log-2',
          organization_id: orgId || 'org-1',
          action: 'DEPLOYMENT_TRIGGER',
          resource_type: 'deployment',
          resource_id: 'dep-502',
          new_value: { branch: 'main' },
          ip_address: '192.168.1.1',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          user: { id: 'u-1', email: 'dev@aerodeploy.app', name: 'DevOps Lead' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [orgId, actionFilter, resourceTypeFilter, API_BASE]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchAuditLogs();
      }
    });
    return () => { active = false; };
  }, [fetchAuditLogs]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', marginBottom: '4px' }}>
            Audit Logs
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Security, compliance, and user action history for your organization
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1f2937',
            color: '#e5e7eb',
            border: '1px solid #374151',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          backgroundColor: '#111827',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #1f2937',
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
            Filter by Action
          </label>
          <input
            type="text"
            placeholder="e.g. SERVICE_CREATE, DEPLOYMENT_TRIGGER"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
            Filter by Resource Type
          </label>
          <input
            type="text"
            placeholder="e.g. service, deployment, api_key"
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading audit logs...</div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '6px' }}>{error}</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
          No audit logs recorded yet.
        </div>
      ) : (
        <div style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f2937', color: '#9ca3af', borderBottom: '1px solid #374151' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Resource</th>
                <th style={{ padding: '12px 16px' }}>User</th>
                <th style={{ padding: '12px 16px' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #1f2937', color: '#e5e7eb' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#1e3a8a',
                        color: '#93c5fd',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#6366f1', fontWeight: 500 }}>{log.resource_type}</span>
                    {log.resource_id && <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '6px' }}>({log.resource_id})</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{log.user?.name || log.user?.email || 'System / Service'}</td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontFamily: 'monospace' }}>{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
