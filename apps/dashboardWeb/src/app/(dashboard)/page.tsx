'use client';

import { getApiBaseUrl } from '@/lib/api-config';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CustomSelect from '../../components/CustomSelect';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface ServerNode {
  id: string;
  name: string;
  ip: string;
  cpu: number;
  memory: number;
  status: 'online' | 'offline' | 'draining' | 'maintenance';
}

interface CloudService {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'deploying' | 'building' | 'failed' | 'degraded';
  uptime: string;
  endpoint: string;
}

interface Organization {
  id: string;
  name: string;
}

interface ApiService {
  id: string;
  name: string;
  type: string;
  status: CloudService['status'];
  slug: string;
}

interface ApiNode {
  id: string;
  name: string;
  ip_address?: string;
  resource_usage?: {
    cpu?: number;
    memory?: number;
  };
  status: ServerNode['status'];
}

export default function DashboardHome() {
  const [nodes, setNodes] = useState<ServerNode[]>([]);
  const [services, setServices] = useState<CloudService[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState([
    { time: '12:14:02', service: 'system', message: 'Heartbeat received from all active node clusters.', type: 'info' },
    { time: '12:14:15', service: 'aero-api-gateway', message: 'Route sync completed. 18 active routes indexed.', type: 'success' },
    { time: '12:14:38', service: 'aero-postgres-db', message: 'Background vacuum process finished (took 0.4s).', type: 'info' }
  ]);

  const logRef = useRef<HTMLDivElement>(null);
  const lastFetchedOrgIdRef = useRef<string | null>(null);
  const API_BASE = getApiBaseUrl();

  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; aero_session=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Fetch initial organizations & active org
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getSessionToken();

    try {
      // Fetch orgs first
      const orgsRes = await fetch(`${API_BASE}/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!orgsRes.ok) throw new Error('Could not retrieve user organizations');
      
      const rawOrgs = await orgsRes.json();
      const orgsData = Array.isArray(rawOrgs) ? rawOrgs : (rawOrgs?.data || []);
      setOrgs(orgsData);

      let activeOrgId = null;
      if (orgsData.length > 0) {
        const savedOrgId = localStorage.getItem('aero_active_org_id');
        const exists = orgsData.some((o: Organization) => o.id === savedOrgId);
        activeOrgId = exists ? savedOrgId : orgsData[0].id;
        setSelectedOrgId(activeOrgId);
        if (activeOrgId) {
          localStorage.setItem('aero_active_org_id', activeOrgId);
        }
      }

      // Fetch services (global)
      const servicesRes = await fetch(`${API_BASE}/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (servicesRes.ok) {
        const rawServices = await servicesRes.json();
        const servicesData = Array.isArray(rawServices) ? rawServices : (rawServices?.data || []);
        setServices(servicesData.map((s: ApiService) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          status: s.status,
          uptime: 'Active',
          endpoint: `${s.slug}.aerodeploy.app`
        })));
      }

      // Fetch nodes for active org
      if (activeOrgId) {
        const nodesRes = await fetch(`${API_BASE}/organizations/${activeOrgId}/nodes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (nodesRes.ok) {
          const rawNodes = await nodesRes.json();
          const nodesData = Array.isArray(rawNodes) ? rawNodes : (rawNodes?.data || []);
          setNodes(nodesData.map((n: ApiNode) => ({
            id: n.id,
            name: n.name,
            ip: n.ip_address || 'N/A',
            cpu: n.resource_usage?.cpu || 10,
            memory: n.resource_usage?.memory || 20,
            status: n.status
          })));
          lastFetchedOrgIdRef.current = activeOrgId;
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchDashboardData();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchDashboardData]);

  // Fetch nodes when org changes
  useEffect(() => {
    if (!selectedOrgId || loading) return;
    if (selectedOrgId === lastFetchedOrgIdRef.current) return;

    const fetchNodesForOrg = async () => {
      const token = getSessionToken();
      try {
        const res = await fetch(`${API_BASE}/organizations/${selectedOrgId}/nodes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setNodes(data.map((n: ApiNode) => ({
            id: n.id,
            name: n.name,
            ip: n.ip_address || 'N/A',
            cpu: n.resource_usage?.cpu || 10,
            memory: n.resource_usage?.memory || 20,
            status: n.status
          })));
          lastFetchedOrgIdRef.current = selectedOrgId;
        }
      } catch (err) {
        console.error('Failed to reload nodes', err);
      }
    };

    fetchNodesForOrg();
  }, [selectedOrgId, loading, API_BASE]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('aero_active_org_id', orgId);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate active host telemetry fluctuations for loaded nodes
  useEffect(() => {
    const timer = setInterval(() => {
      setNodes(prev => prev.map(n => {
        if (n.status === 'offline') return n;
        return {
          ...n,
          cpu: Math.max(5, Math.min(95, n.cpu + Math.floor(Math.random() * 11) - 5)),
          memory: Math.max(10, Math.min(90, n.memory + Math.floor(Math.random() * 5) - 2))
        };
      }));

      // Randomly append logs
      const servicesNames = ['aero-api-gateway', 'system', 'aero-web-dashboard'];
      const messages = [
        'API traffic threshold normalized: 240 req/sec.',
        'Token claims parsed successfully. Grant granted.',
        'Disk metrics checked. fra-node-core-01 has 82% capacity left.',
        'Garbage collection complete.'
      ];
      const randomService = servicesNames[Math.floor(Math.random() * servicesNames.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      const time = new Date().toTimeString().split(' ')[0];

      setLogs(prev => [
        ...prev,
        { time, service: randomService, message: randomMessage, type: 'info' }
      ].slice(-50));
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleService = async (id: string, currentStatus: string, name: string) => {
    const token = getSessionToken();
    const action = currentStatus === 'running' ? 'stop' : 'start';
    const logTime = new Date().toTimeString().split(' ')[0];
    
    setLogs(l => [
      ...l,
      {
        time: logTime,
        service: name,
        message: `Service manual trigger: ${action === 'start' ? 'startup' : 'shutdown'} initiated.`,
        type: action === 'start' ? 'success' : 'warn'
      }
    ]);

    try {
      const res = await fetch(`${API_BASE}/services/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        // Re-fetch services
        const servicesRes = await fetch(`${API_BASE}/services`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.map((s: ApiService) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            status: s.status,
            uptime: 'Active',
            endpoint: `${s.slug}.aerodeploy.app`
          })));
        }
      }
    } catch (err) {
      console.error(`Failed to toggle service status: ${action}`, err);
    }
  };

  // Error State Render Helper
  const renderError = (msg: string) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      background: 'rgba(239, 68, 68, 0.02)',
      border: '1px dashed rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '40px auto',
    }}>
      <svg style={{ color: '#f87171', marginBottom: '16px' }} width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f87171', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        OH SNAP!
      </h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
        There might be a problem in our servers. {msg}
      </p>
      <button 
        onClick={fetchDashboardData}
        className="nav-item active" 
        style={{ width: 'auto', padding: '8px 20px', fontSize: '12px', cursor: 'pointer' }}
      >
        Retry connection
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '100px 0' 
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
    );
  }

  if (error) {
    return renderError(error);
  }

  const averageCpu = nodes.length > 0 && nodes.some(n => n.status === 'online')
    ? Math.round(nodes.filter(n => n.status === 'online').reduce((acc, curr) => acc + curr.cpu, 0) / nodes.filter(n => n.status === 'online').length)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🌟 Welcome / Overview Header */}
      <PageHeader
        title="Platform Infrastructure"
        description="Monitor cluster nodes, control active static/gateway microservices, and watch global container orchestrations."
        actions={
          orgs.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-slate-400">ORGANIZATION</span>
              <CustomSelect
                value={selectedOrgId || ''}
                onChange={handleOrgChange}
                options={orgs.map(org => ({ value: org.id, label: org.name }))}
                style={{ width: '180px' }}
              />
            </div>
          ) : undefined
        }
      />

      {/* 📊 High-Level Metrics Summary Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card hoverable>
          <CardBody className="space-y-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Global Cluster Load</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white tracking-tight">{averageCpu}%</span>
              <Badge status="running" label="CPU Average" />
            </div>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardBody className="space-y-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Registered Nodes</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white tracking-tight">
                {nodes.filter(n => n.status === 'online').length} <span className="text-lg text-slate-500 font-normal">/ {nodes.length}</span>
              </span>
              <Badge status="online" label="Heartbeats Active" />
            </div>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardBody className="space-y-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Microservices</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white tracking-tight">
                {services.filter(s => s.status === 'running').length} <span className="text-lg text-slate-500 font-normal">/ {services.length}</span>
              </span>
              <Badge status="running" label="Running Healthily" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 🖥️ Nodes Status Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white tracking-tight">Hardware Clusters & Hypervisors</h2>
        {nodes.length === 0 ? (
          <EmptyState
            title="No Nodes Connected"
            description="No registered server nodes connected to this organization."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nodes.map(node => (
              <Card key={node.id} hoverable className={node.status === 'offline' ? 'opacity-60' : ''}>
                <CardHeader>
                  <div>
                    <CardTitle>{node.name}</CardTitle>
                    <span className="text-xs font-mono text-slate-400">{node.ip}</span>
                  </div>
                  <Badge status={node.status} />
                </CardHeader>

                <CardBody>
                  {node.status === 'online' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Processor (CPU)</span>
                          <span className="font-semibold text-white">{node.cpu}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${node.cpu}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Memory (RAM)</span>
                          <span className="font-semibold text-white">{node.memory}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${node.memory}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2 text-center">
                      Awaiting edge daemon connection handshakes...
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 📦 Containers & Logs Double Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Services Console */}
        <Card>
          <CardHeader>
            <CardTitle>Deployed Core Microservices</CardTitle>
          </CardHeader>
          <CardBody>
            {services.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No active services currently deployed.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {services.map(service => (
                  <div key={service.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0 gap-3">
                    <div className="min-width-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-100 truncate">{service.name}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">{service.type}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono block mt-0.5">{service.endpoint}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge status={service.status} showPulse />
                      <Button
                        size="sm"
                        variant={service.status === 'running' ? 'danger' : 'primary'}
                        onClick={() => handleToggleService(service.id, service.status, service.name)} 
                        disabled={service.status === 'deploying' || service.status === 'building'}
                      >
                        {service.status === 'running' ? 'Stop' : 'Start'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Real-time System Stream Console */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Aero Orchestrator Event Log</CardTitle>
          </CardHeader>
          <CardBody className="flex-1 flex flex-col space-y-3">
            <div className="bg-[#0B0F19] border border-slate-800/80 rounded-lg p-3 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5 flex-1" ref={logRef}>
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className="text-cyan-400 shrink-0">{log.service}:</span>
                  <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-800/60">
              <span className="font-mono text-slate-500">fra-cluster-manager # ready</span>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => setLogs([{ time: new Date().toTimeString().split(' ')[0], service: 'system', message: 'Logger logs history truncated.', type: 'info' }])}
              >
                Flush Stream Buffer
              </Button>
            </div>
          </CardBody>
        </Card>

      </div>

    </div>
  );
}

