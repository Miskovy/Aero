'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Domain { id: string; domain: string; type: string; verification_status: string; }
interface EnvVar { id: string; key: string; created_at: string; }
interface DeploymentLog { id: string; phase: string; message: string; level: string; created_at: string; }
interface Deployment { id: string; status: string; trigger: string; git_commit_sha?: string; created_at: string; finished_at?: string; logs?: DeploymentLog[]; }
interface NodeInfo { id: string; name: string; status: string; hostname: string; last_heartbeat_at?: string; }
interface ResourceLimits {
  cpu?: string | number;
  memory?: string | number;
}
interface HealthCheck {
  path?: string;
  port?: number;
  interval?: number;
}
interface RestartPolicy {
  condition?: string;
  max_attempts?: number;
}
interface ServiceDetail {
  id: string; name: string; slug: string; type: string; status: string;
  source_type: string; git_repository?: string; git_branch?: string;
  docker_image?: string; internal_port?: number; replicas?: number;
  build_command?: string; start_command?: string;
  created_at: string; updated_at: string;
  domains: Domain[]; variables: EnvVar[]; secrets: EnvVar[];
  node?: NodeInfo; deployments: Deployment[];
  resource_limits?: ResourceLimits;
  health_check?: HealthCheck;
  restart_policy?: RestartPolicy;
  project?: { id: string; name: string; };
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'domains' | 'env' | 'logs'>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const API_BASE = '/api';
  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split('; aero_session=');
    if (p.length === 2) return p.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchService = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setService(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchService();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchService]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (action === 'delete' && !confirm(`Delete service "${service?.name}"? This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/${action}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      if (action === 'delete') { router.push('/services'); return; }
      await fetchService();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeploy = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/deployments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to trigger deployment');
      await fetchService();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchDeploymentLogs = async (deploymentId: string) => {
    setSelectedDeploymentId(deploymentId);
    setLogsLoading(true); setActiveTab('logs');
    try {
      const res = await fetch(`${API_BASE}/services/${serviceId}/deployments/${deploymentId}/logs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setDeploymentLogs(await res.json());
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };

  const statusColor = (s: string) => {
    if (s === 'running') return 'var(--accent-cyan)';
    if (s === 'deploying' || s === 'building' || s === 'queued') return '#fbbf24';
    if (s === 'stopped') return 'var(--text-dim)';
    return '#ef4444';
  };

  const relTime = (d?: string) => {
    if (!d) return '—';
    if (!now) return 'loading...';
    const diff = now - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.throbber{width:36px;height:36px;border:3px solid rgba(56,189,248,0.1);border-top:3px solid var(--accent-cyan,#38bdf8);border-radius:50%;animation:spin .8s linear infinite}`}</style>
      <div className="throbber" />
    </div>
  );

  if (error || !service) return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <p style={{ color: '#f87171', marginBottom: '16px' }}>Failed to load service: {error}</p>
      <button onClick={fetchService} className="nav-item active" style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}>Retry</button>
    </div>
  );

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'deployments', label: `Deployments (${service.deployments.length})` },
    { key: 'domains', label: `Domains (${service.domains.length})` },
    { key: 'env', label: `Variables (${service.variables.length})` },
    { key: 'logs', label: 'Logs' },
  ] as const;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button onClick={() => router.push('/services')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            Back to Services
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px' }}>{service.name}</h1>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>{service.type}</span>
            <span className="pulse-dot" style={{ backgroundColor: statusColor(service.status), boxShadow: `0 0 8px ${statusColor(service.status)}` }} />
            <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: statusColor(service.status) }}>{service.status}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{service.slug}.aerodeploy.app</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button disabled={actionLoading} onClick={handleDeploy} style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>
            {actionLoading ? '...' : '▶ DEPLOY'}
          </button>
          {service.status === 'running' ? (<>
            <button disabled={actionLoading} onClick={() => handleAction('stop')} style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>STOP</button>
            <button disabled={actionLoading} onClick={() => handleAction('restart')} style={{ padding: '8px 16px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>RESTART</button>
          </>) : (
            <button disabled={actionLoading} onClick={() => handleAction('start')} style={{ padding: '8px 16px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>START</button>
          )}
          <button disabled={actionLoading} onClick={() => handleAction('delete')} style={{ padding: '8px 16px', fontSize: '11px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, width: 'auto' }}>DELETE</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: 'auto',
            background: 'transparent', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-dim)',
            transition: 'all 0.2s ease',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Service Info */}
          <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Configuration</h3>
            {[
              ['Source', service.source_type],
              ['Repository', service.git_repository || '—'],
              ['Branch', service.git_branch || '—'],
              ['Docker Image', service.docker_image || '—'],
              ['Port', String(service.internal_port || 3000)],
              ['Replicas', String(service.replicas || 1)],
              ['Build Command', service.build_command || '—'],
              ['Start Command', service.start_command || '—'],
              ['Created', relTime(service.created_at)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Node Info */}
          <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Node</h3>
            {service.node ? (<>
              {[
                ['Name', service.node.name],
                ['Hostname', service.node.hostname],
                ['Status', service.node.status],
                ['Last Heartbeat', relTime(service.node.last_heartbeat_at)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                  <span style={{ color: label === 'Status' ? statusColor(val) : 'var(--text-primary)', fontWeight: label === 'Status' ? 600 : 400, textTransform: label === 'Status' ? 'uppercase' : 'none', fontSize: '12px' }}>{val}</span>
                </div>
              ))}
            </>) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No node assigned. Deploy via CLI to assign a node.</p>
            )}

            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginTop: '24px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{service.project?.name || 'Unknown'}</p>
          </div>
        </div>
      )}

      {activeTab === 'deployments' && (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
          {service.deployments.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No deployments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {service.deployments.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '6px', background: selectedDeploymentId === d.id ? 'rgba(56,189,248,0.05)' : 'transparent', border: selectedDeploymentId === d.id ? '1px solid rgba(56,189,248,0.1)' : '1px solid transparent', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="pulse-dot" style={{ backgroundColor: statusColor(d.status), boxShadow: `0 0 6px ${statusColor(d.status)}` }} />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{d.status.toUpperCase()}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>via {d.trigger} · {relTime(d.created_at)}</span>
                      {d.git_commit_sha && <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>{d.git_commit_sha.substring(0, 7)}</span>}
                    </div>
                  </div>
                  <button onClick={() => fetchDeploymentLogs(d.id)} style={{ padding: '5px 12px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, width: 'auto' }}>VIEW LOGS</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'domains' && (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
          {service.domains.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No domains configured.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {service.domains.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{d.domain}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', marginLeft: '10px', background: d.type === 'auto_generated' ? 'rgba(56,189,248,0.1)' : 'rgba(168,85,247,0.1)', color: d.type === 'auto_generated' ? 'var(--accent-cyan)' : '#a855f7', fontWeight: 600, textTransform: 'uppercase' }}>{d.type.replace('_', ' ')}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: d.verification_status === 'verified' ? 'var(--accent-cyan)' : '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>
                    {d.verification_status === 'verified' ? '✓ VERIFIED' : '⏳ ' + d.verification_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'env' && (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Environment Variables</h3>
          {service.variables.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No environment variables set.</p>
          ) : service.variables.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.key}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>••••••••</span>
            </div>
          ))}

          {service.secrets.length > 0 && (<>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginTop: '24px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secrets</h3>
            {service.secrets.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                <span style={{ color: '#a855f7', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{s.key}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>🔒 encrypted</span>
              </div>
            ))}
          </>)}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '0', overflow: 'hidden' }}>
          {!selectedDeploymentId ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>Select a deployment from the Deployments tab to view logs.</p>
          ) : logsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="throbber" /></div>
          ) : deploymentLogs.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No logs available for this deployment.</p>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '16px' }}>
              {deploymentLogs.map((log, i) => (
                <div key={log.id || i} style={{ display: 'flex', gap: '10px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', minWidth: '60px', flexShrink: 0 }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span style={{ fontSize: '10px', minWidth: '70px', flexShrink: 0, color: log.phase === 'failed' ? '#ef4444' : log.phase === 'completed' ? 'var(--accent-cyan)' : '#a855f7', fontWeight: 600, textTransform: 'uppercase' }}>{log.phase}</span>
                  <span style={{ color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : 'var(--text-primary)', wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
