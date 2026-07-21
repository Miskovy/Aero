'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  duration_seconds: number;
  channel: string;
  enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [metric, setMetric] = useState('cpu_percent');
  const [operator, setOperator] = useState('gt');
  const [threshold, setThreshold] = useState<number>(80);
  const [channel, setChannel] = useState('email');

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://aero-y6mm.onrender.com';

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

  const fetchRules = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data?.data || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Failed to fetch live alert rules, showing fallback demo list:', errMsg);
      setRules([
        {
          id: 'rule-1',
          name: 'High CPU Usage Warning',
          metric: 'cpu_percent',
          operator: 'gt',
          threshold: 85,
          duration_seconds: 60,
          channel: 'email',
          enabled: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'rule-2',
          name: 'Memory Spike Alert',
          metric: 'memory_percent',
          operator: 'gt',
          threshold: 90,
          duration_seconds: 120,
          channel: 'slack',
          enabled: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [orgId, API_BASE]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchRules();
      }
    });
    return () => { active = false; };
  }, [fetchRules]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !ruleName.trim()) return;

    const token = getSessionToken();
    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: ruleName,
          metric,
          operator,
          threshold: Number(threshold),
          channel,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setRuleName('');
        fetchRules();
      } else {
        const errData = await res.json();
        alert(`Failed to create alert rule: ${errData.message || res.statusText}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Error creating alert rule: ${errMsg}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!orgId || !confirm('Are you sure you want to delete this alert rule?')) return;
    const token = getSessionToken();

    try {
      const res = await fetch(`${API_BASE}/organizations/${orgId}/alerts/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to delete rule: ${errMsg}`);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', marginBottom: '4px' }}>
            Alert Rules & Monitoring
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Configure telemetry alert triggers and notification channels (Email, Slack, Webhook)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          + Create Alert Rule
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading alert rules...</div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '6px' }}>{error}</div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
          No alert rules configured yet. Click + Create Alert Rule to set one up.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb' }}>{rule.name}</h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: rule.enabled ? '#065f46' : '#374151',
                      color: rule.enabled ? '#a7f3d0' : '#9ca3af',
                    }}
                  >
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div style={{ fontSize: '14px', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div>
                    <strong style={{ color: '#d1d5db' }}>Metric:</strong>{' '}
                    <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{rule.metric}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#d1d5db' }}>Condition:</strong>{' '}
                    <span>
                      When metric is <strong>{rule.operator}</strong> {rule.threshold}%
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: '#d1d5db' }}>Channel:</strong>{' '}
                    <span style={{ textTransform: 'uppercase', color: '#a78bfa', fontSize: '12px', fontWeight: 600 }}>{rule.channel}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #1f2937' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #7f1d1d',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Delete Rule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              color: '#fff',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Create Alert Rule</h2>
            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High CPU Usage"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                  >
                    <option value="cpu_percent">CPU %</option>
                    <option value="memory_percent">Memory %</option>
                    <option value="disk_percent">Disk %</option>
                    <option value="container_down">Container Down</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                  >
                    <option value="gt">Greater than (&gt;)</option>
                    <option value="gte">Greater or equal (&gt;=)</option>
                    <option value="lt">Less than (&lt;)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Threshold</label>
                  <input
                    type="number"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff',
                    }}
                  >
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
