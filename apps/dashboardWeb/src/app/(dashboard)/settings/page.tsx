'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  organization?: { id: string; name: string; slug: string; } | null;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const API_BASE = '/api';
  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split('; aero_session=');
    if (p.length === 2) return p.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/api-keys`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setApiKeys(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/users/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setNewKeyName('');
        await fetchKeys();
      }
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    try {
      await fetch(`${API_BASE}/users/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      await fetchKeys();
    } catch { /* ignore */ }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relTime = (d?: string | null) => {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>Settings</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '32px' }}>Manage API keys for CI/CD integrations and programmatic access.</p>

      {/* API Keys Section */}
      <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>API KEYS</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Use API keys to authenticate from CI/CD pipelines, scripts, or third-party tools.</p>
          </div>
          <button onClick={() => { setShowCreate(true); setCreatedKey(null); }} style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>
            + NEW KEY
          </button>
        </div>

        {/* Created Key Banner */}
        {createdKey && (
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>✓ API KEY CREATED — COPY IT NOW (it won't be shown again)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ flex: 1, fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '4px', wordBreak: 'break-all' }}>{createdKey}</code>
              <button onClick={() => handleCopy(createdKey)} style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: copied ? '#22c55e' : 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', width: 'auto', fontWeight: 500 }}>
                {copied ? '✓ COPIED' : 'COPY'}
              </button>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreate && !createdKey && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. GitHub Actions)" style={{ flex: 1, padding: '10px 14px', fontSize: '13px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <button onClick={handleCreate} disabled={creating || !newKeyName.trim()} style={{ padding: '10px 16px', fontSize: '11px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>
              {creating ? '...' : 'CREATE'}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 12px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-dim)', borderRadius: '6px', cursor: 'pointer', width: 'auto' }}>CANCEL</button>
          </div>
        )}

        {/* Keys List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.throbber{width:28px;height:28px;border:3px solid rgba(56,189,248,0.1);border-top:3px solid var(--accent-cyan,#38bdf8);border-radius:50%;animation:spin .8s linear infinite}`}</style>
            <div className="throbber" />
          </div>
        ) : apiKeys.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>No API keys created yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {apiKeys.map(key => (
              <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{key.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '10px', fontFamily: 'var(--font-mono)' }}>{key.key_prefix}...</span>
                  {key.organization && <span style={{ fontSize: '10px', marginLeft: '10px', padding: '2px 6px', borderRadius: '3px', background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{key.organization.name}</span>}
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Created {relTime(key.created_at)} · Last used {relTime(key.last_used_at)}
                    {key.expires_at && <span> · Expires {new Date(key.expires_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(key.id)} style={{ padding: '5px 12px', fontSize: '11px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, width: 'auto' }}>REVOKE</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
