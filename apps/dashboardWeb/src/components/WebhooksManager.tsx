'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Webhook {
  id: string;
  name: string;
  provider: string;
  events: string[] | unknown; // Could be Json or array
  branch_filter: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  last_status: string | null;
  created_at: string;
  secret_token: string;
  webhook_url: string;
}

interface WebhooksManagerProps {
  serviceId: string;
}

export default function WebhooksManager({ serviceId }: WebhooksManagerProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('github');
  const [branchFilter, setBranchFilter] = useState('');
  
  // Successful creation display (to show secret token once)
  const [newlyCreated, setNewlyCreated] = useState<{
    name: string;
    secretToken: string;
    webhookUrl: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<'url' | 'secret' | null>(null);

  const API_BASE = '/api';

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split('; aero_session=');
    if (p.length === 2) return p.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/webhooks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setWebhooks(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchWebhooks();
    });
  }, [fetchWebhooks]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setActionLoading(true);
    setError(null);
    setNewlyCreated(null);

    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          provider,
          events: ['push'],
          branchFilter: branchFilter.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create webhook');
      }

      const data = await res.json();
      
      // Construct absolute webhook URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const webhookUrl = `${origin}${data.webhook_url}`;

      setNewlyCreated({
        name: data.name,
        secretToken: data.secret_token,
        webhookUrl: webhookUrl,
      });

      // Clear Form
      setName('');
      setBranchFilter('');
      setIsAdding(false);

      // Refresh list
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string, webhookName: string) => {
    if (!confirm(`Are you sure you want to delete the webhook "${webhookName}"?`)) return;

    setError(null);
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete webhook');
      }

      // Refresh list
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const copyToClipboard = (text: string, field: 'url' | 'secret') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatEvents = (events: unknown) => {
    if (Array.isArray(events)) return events.join(', ');
    if (typeof events === 'string') {
      try {
        const parsed = JSON.parse(events);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch {}
      return events;
    }
    return 'push';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header and Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            WEBHOOK ENDPOINTS
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Automatically trigger deployments when code changes are pushed to your git repository.
          </p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setNewlyCreated(null);
          }} 
          style={{ 
            padding: '8px 16px', 
            fontSize: '11px', 
            background: isAdding ? 'rgba(239, 68, 68, 0.05)' : 'rgba(56,189,248,0.1)', 
            border: isAdding ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(56,189,248,0.2)', 
            color: isAdding ? '#f87171' : 'var(--accent-cyan)', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            width: 'auto' 
          }}
        >
          {isAdding ? 'CANCEL' : '+ NEW WEBHOOK'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Creation Success Banner (Only displays secret token once) */}
      {newlyCreated && (
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: 'rgba(56, 189, 248, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)' }}>✓</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Webhook &quot;{newlyCreated.name}&quot; Created Successfully!</strong>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
            Configure these parameters in your repository manager settings (e.g. GitHub Repository Settings {' > '} Webhooks {' > '} Add webhook).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Payload URL */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Payload URL</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={newlyCreated.webhookUrl} 
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                />
                <button 
                  onClick={() => copyToClipboard(newlyCreated.webhookUrl, 'url')}
                  style={{ padding: '8px 12px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', width: 'auto' }}
                >
                  {copiedField === 'url' ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>

            {/* Secret Token */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Secret Token (Shown Once!)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={newlyCreated.secretToken} 
                  style={{ flex: 1, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}
                />
                <button 
                  onClick={() => copyToClipboard(newlyCreated.secretToken, 'secret')}
                  style={{ padding: '8px 12px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '6px', cursor: 'pointer', width: 'auto' }}
                >
                  {copiedField === 'secret' ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Webhook Form */}
      {isAdding && (
        <form onSubmit={handleCreateWebhook} style={{
          padding: '20px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Create Webhook</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Friendly Name</label>
              <input 
                type="text" 
                placeholder="e.g. GitHub Push Hook" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Provider</label>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">BitBucket</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Branch Filter (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. main (blank for all branches)" 
                value={branchFilter} 
                onChange={(e) => setBranchFilter(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Events</label>
              <input 
                type="text" 
                readOnly 
                value="Push Events" 
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-dim)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={actionLoading}
            style={{ 
              alignSelf: 'flex-start',
              padding: '10px 24px', 
              fontSize: '12px', 
              background: 'var(--accent-cyan)', 
              border: 'none', 
              color: '#000000', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 600, 
              width: 'auto' 
            }}
          >
            {actionLoading ? 'CREATING...' : 'CREATE WEBHOOK'}
          </button>
        </form>
      )}

      {/* Webhooks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="throbber" />
          </div>
        ) : webhooks.length === 0 ? (
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
          }}>
            <svg style={{ color: 'var(--text-dim)', marginBottom: '16px' }} width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.193-9.193a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757" />
            </svg>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              NO WEBHOOKS CONFIGURED
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '12.5px', lineHeight: '1.5', maxWidth: '340px', margin: 0 }}>
              Create a webhook endpoint to automatically deploy code updates directly from your provider.
            </p>
          </div>
        ) : (
          webhooks.map((wh) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const absoluteUrl = `${origin}${wh.webhook_url}`;

            return (
              <div 
                key={wh.id} 
                style={{ 
                  padding: '16px', 
                  background: 'var(--bg-primary)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Top Row: Name, Provider, Status, Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{wh.name}</strong>
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--accent-cyan)', 
                        fontWeight: 600, 
                        textTransform: 'uppercase' 
                      }}>
                        {wh.provider}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span>Events: <strong style={{ color: 'var(--text-primary)' }}>{formatEvents(wh.events)}</strong></span>
                      <span>Branch: <strong style={{ color: 'var(--text-primary)' }}>{wh.branch_filter || 'all branches'}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px' }}>
                      <span style={{ color: wh.is_active ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 600 }}>
                        {wh.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      {wh.last_triggered_at && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                          Last triggered: {new Date(wh.last_triggered_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteWebhook(wh.id, wh.name)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#f87171', 
                        cursor: 'pointer', 
                        padding: '6px', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'auto'
                      }}
                      title="Delete Webhook"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Webhook Payload URL copy section */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '6px', 
                  padding: '6px 10px' 
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>URL</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {absoluteUrl}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(absoluteUrl, 'url')}
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '10px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--border-glass)', 
                      color: 'var(--text-primary)', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      width: 'auto' 
                    }}
                  >
                    COPY
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
