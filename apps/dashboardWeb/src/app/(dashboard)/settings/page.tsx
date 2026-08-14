'use client';

import { getApiBaseUrl } from '@/lib/api-config';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

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
  const [now, setNow] = useState<number | null>(null);

  const API_BASE = getApiBaseUrl();
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
  }, [API_BASE]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKeys();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchKeys]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/users/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.raw_key);
        setNewKeyName('');
        setShowCreate(false);
        await fetchKeys();
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Any applications using it will immediately lose access.')) return;
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
    if (!now) return 'loading...';
    const diff = now - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
      {/* Settings Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <Link
          href="/settings"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 shadow-xs"
        >
          API Keys
        </Link>
        <Link
          href="/settings/webhooks"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#88909c] hover:text-[#f3f0ea] hover:bg-[#161a22] transition-colors"
        >
          Webhooks
        </Link>
        <Link
          href="/settings/subscriptions"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#88909c] hover:text-[#f3f0ea] hover:bg-[#161a22] transition-colors"
        >
          Subscriptions &amp; XPay
        </Link>
      </div>

      <PageHeader
        title="API Keys &amp; Integrations"
        description="Manage API access tokens for continuous integration, CLI automation, and programmatic deployment."
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Programmatic API Keys</CardTitle>
            <p className="text-xs text-[#88909c] mt-1">Use these tokens to securely authenticate GitHub Actions, Docker daemons, or custom CI runners.</p>
          </div>
          {!showCreate && (
            <Button
              onClick={() => { setShowCreate(true); setCreatedKey(null); }}
              variant="primary"
              size="sm"
            >
              + New API Key
            </Button>
          )}
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Created Key Banner */}
          {createdKey && (
            <div className="p-4 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#38bdf8] uppercase tracking-wider font-mono">
                  New API Key Generated — Copy Now
                </span>
                <button
                  onClick={() => handleCopy(createdKey)}
                  className="text-xs text-[#38bdf8] hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-[#88909c]">This key will never be shown again. Store it securely in your secrets manager.</p>
              <div className="p-2.5 rounded-lg bg-[#0b0d11] font-mono text-xs text-[#38bdf8] break-all border border-white/[0.08] select-all">
                {createdKey}
              </div>
            </div>
          )}

          {/* Create Form Inline */}
          {showCreate && (
            <div className="p-4 rounded-xl bg-[#161a22]/60 border border-white/[0.08] space-y-3">
              <span className="text-xs font-semibold text-[#f3f0ea]">Generate New API Key</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key description (e.g. GitHub Actions Staging Deployer)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  className="flex-1 px-3 py-2 text-xs bg-[#11141a] border border-white/[0.08] rounded-lg text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
                  autoFocus
                />
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  isLoading={creating}
                  variant="primary"
                  size="sm"
                >
                  Generate
                </Button>
                <Button
                  onClick={() => { setShowCreate(false); setNewKeyName(''); }}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Keys List */}
          {loading ? (
            <LoadingSkeleton count={3} height="h-16" />
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-10 text-[#88909c] text-sm">
              No API keys created yet. Generate one to integrate with CI/CD tools.
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map(key => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#161a22]/50 border border-white/[0.06] hover:border-white/[0.12] transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#f3f0ea]">{key.name}</span>
                      <span className="text-xs text-[#38bdf8] font-mono bg-[#38bdf8]/12 px-2 py-0.5 rounded border border-[#38bdf8]/25">
                        {key.key_prefix}...
                      </span>
                      {key.organization && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 font-mono">
                          {key.organization.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#88909c]">
                      Created {relTime(key.created_at)} · Last used {relTime(key.last_used_at)}
                      {key.expires_at && <span> · Expires {new Date(key.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDelete(key.id)}
                    variant="danger"
                    size="sm"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
