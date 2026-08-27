'use client';

import { getApiBaseUrl } from '@/lib/api-config';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import CustomSelect from '../../components/CustomSelect';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import ArtisticMountainCanvas from '@/components/ArtisticMountainCanvas';
import StickFigureMeetingIllustration from '@/components/StickFigureMeetingIllustration';

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
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'system' | 'gateway' | 'db'>('all');

  const [logs, setLogs] = useState([
    { time: '12:14:02', service: 'system', message: 'Heartbeat received from active mesh clusters.', type: 'info' },
    { time: '12:14:15', service: 'aero-api-gateway', message: 'Route sync verified. Ingress nodes calibrated.', type: 'success' },
    { time: '12:14:38', service: 'aero-postgres-db', message: 'Background vacuum complete (took 0.28s).', type: 'info' }
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
      
      let orgsData: Organization[] = [];
      if (orgsRes.ok) {
        const rawOrgs = await orgsRes.json();
        orgsData = Array.isArray(rawOrgs) ? rawOrgs : (rawOrgs?.data || []);
      }
      setOrgs(orgsData);

      let activeOrgId: string | null = null;
      if (orgsData.length > 0) {
        const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('aero_active_org_id') : null;
        const exists = orgsData.some((o: Organization) => o.id === savedOrgId);
        activeOrgId = exists && savedOrgId ? savedOrgId : orgsData[0].id;
        setSelectedOrgId(activeOrgId);
        if (activeOrgId && typeof window !== 'undefined') {
          localStorage.setItem('aero_active_org_id', activeOrgId);
        }
      } else {
        setSelectedOrgId(null);
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
            ip: n.ip_address || '127.0.0.1',
            cpu: n.resource_usage?.cpu ?? 0,
            memory: n.resource_usage?.memory ?? 0,
            status: n.status || 'offline'
          })));
        }
        lastFetchedOrgIdRef.current = activeOrgId;
      } else {
        setNodes([]);
      }
    } catch (err: unknown) {
      console.warn('Dashboard data fetch warning:', err);
      setOrgs([]);
      setSelectedOrgId(null);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchDashboardData();
    });
    return () => { active = false; };
  }, [fetchDashboardData]);

  // Handle active organization switch
  const handleOrgChange = async (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aero_active_org_id', newOrgId);
    }
    const token = getSessionToken();
    try {
      const nodesRes = await fetch(`${API_BASE}/organizations/${newOrgId}/nodes`, {
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
          ip: n.ip_address || '127.0.0.1',
          cpu: n.resource_usage?.cpu ?? 0,
          memory: n.resource_usage?.memory ?? 0,
          status: n.status || 'offline'
        })));
      }
      lastFetchedOrgIdRef.current = newOrgId;
    } catch {
      /* Handled */
    }
  };

  // Toggle service start / stop
  const handleToggleService = async (serviceId: string, currentStatus: string, serviceName: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start';
    const nextStatus = action === 'start' ? 'running' : 'stopped';

    // Optimistic UI state
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: nextStatus as CloudService['status'] } : s));

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
        // Revert on failure
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: currentStatus as CloudService['status'] } : s));
      } else {
        const timeString = new Date().toTimeString().split(' ')[0];
        setLogs(prev => [
          ...prev.slice(-40),
          {
            time: timeString,
            service: serviceName,
            message: `Command [${action.toUpperCase()}] acknowledged by worker daemon.`,
            type: action === 'start' ? 'success' : 'info'
          }
        ]);
      }
    } catch {
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: currentStatus as CloudService['status'] } : s));
    }
  };

  // Live polling for node CPU & telemetry
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const activeOrgId = selectedOrgId;
      if (!activeOrgId) return;

      const token = getSessionToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/organizations/${activeOrgId}/nodes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const rawNodes = await res.json();
          const nodesData = Array.isArray(rawNodes) ? rawNodes : (rawNodes?.data || []);
          if (nodesData.length > 0) {
            setNodes(nodesData.map((n: ApiNode) => ({
              id: n.id,
              name: n.name,
              ip: n.ip_address || '127.0.0.1',
              cpu: n.resource_usage?.cpu ?? 0,
              memory: n.resource_usage?.memory ?? 0,
              status: n.status || 'offline'
            })));
          }
        }
      } catch {
        /* No-op */
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [API_BASE, selectedOrgId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(`https://${text}`);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  // Error State Render Helper
  const renderError = (msg: string) => (
    <div className="flex flex-col items-center justify-center p-12 bg-[#ef4444]/[0.05] border border-[#ef4444]/20 rounded-2xl text-center max-w-lg mx-auto my-12 backdrop-blur-xs">
      <div className="p-3 bg-[#ef4444]/10 rounded-2xl text-[#f87171] mb-4">
        <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#f3f0ea] mb-2 font-title">
        Daemon Connection Offline
      </h3>
      <p className="text-[#88909c] text-xs leading-relaxed mb-6">
        Unable to communicate with the cluster orchestrator: {msg}
      </p>
      <Button 
        onClick={fetchDashboardData}
        variant="primary"
        size="sm"
      >
        Retry Handshake
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="throbber" />
        <p className="text-xs text-[#88909c] font-medium">Synchronizing cluster topology...</p>
      </div>
    );
  }

  if (error) {
    return renderError(error);
  }

  const averageCpu = nodes.length > 0 && nodes.some(n => n.status === 'online')
    ? Math.round(nodes.filter(n => n.status === 'online').reduce((acc, curr) => acc + curr.cpu, 0) / nodes.filter(n => n.status === 'online').length)
    : 0;

  const onlineNodesCount = nodes.filter(n => n.status === 'online').length;
  const runningServicesCount = services.filter(s => s.status === 'running').length;

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'system') return log.service === 'system';
    if (logFilter === 'gateway') return log.service.includes('gateway');
    if (logFilter === 'db') return log.service.includes('db') || log.service.includes('postgres');
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🌟 Masterpiece Atmospheric Mountain Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#11141a] shadow-md p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Artistic Mountain Backdrop Canvas embedded inside hero banner */}
        <div className="absolute inset-0 z-0 opacity-40">
          <ArtisticMountainCanvas intensity={0.65} showConstellations={true} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#11141a] via-[#11141a]/85 to-transparent" />
        </div>

        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#38bdf8]/12 border border-[#38bdf8]/25 text-[#38bdf8] text-[11px] font-medium">
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f3f0ea] tracking-tight font-title">
            Platform Infrastructure
          </h1>
          <p className="text-xs sm:text-sm text-[#88909c] leading-relaxed">
            Monitor healthy cluster nodes, deploy microservice containers, and inspect real-time edge telemetry with tranquility.
          </p>
        </div>

        {orgs.length > 0 && (
          <div className="relative z-10 flex items-center gap-3 bg-[#161a22]/85 backdrop-blur-md p-2 px-3.5 rounded-2xl border border-white/[0.08] shrink-0 self-start md:self-auto">
            <span className="text-[10.5px] font-semibold tracking-wider text-[#88909c] uppercase font-mono">ORG</span>
            <CustomSelect
              value={selectedOrgId || ''}
              onChange={handleOrgChange}
              options={orgs.map(org => ({ value: org.id, label: org.name }))}
              style={{ width: '200px' }}
            />
          </div>
        )}
      </div>

      {/* When NO organizations exist, display the stick-figure meeting illustration in semi-visible grey */}
      {orgs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-8 sm:p-14 space-y-6">
          <div className="flex justify-center w-full max-w-lg mx-auto">
            <StickFigureMeetingIllustration width="100%" height={230} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold text-[#f3f0ea] tracking-tight font-title">
              No Organization Configured
            </h2>
            <p className="text-xs sm:text-sm text-[#88909c] leading-relaxed">
              To start attaching server nodes, creating projects, and deploying workloads, initialize your organization workspace.
            </p>
          </div>

          <Link href="/organizations">
            <Button variant="primary" size="md">
              + Create Organization
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* 📊 High-Level Metrics Summary Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Metric 1: Cluster Load */}
            <Card hoverable className="relative group">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#88909c] font-mono">Global Cluster Load</span>
                  <Badge status={averageCpu > 80 ? 'warning' : 'running'} label={averageCpu > 80 ? 'High' : 'Optimal'} showPulse />
                </div>
                
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-[#f3f0ea] tracking-tight font-title">{averageCpu}%</span>
                  <span className="text-xs text-[#88909c] font-medium">Telemetry Average</span>
                </div>

                {/* Visual Gauge Bar in Brand Cyan */}
                <div className="w-full bg-[#161a22] rounded-full h-1.5 overflow-hidden p-0.5 border border-white/[0.04]">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      averageCpu > 80 ? 'bg-[#f59e0b]' : 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]'
                    }`} 
                    style={{ width: `${Math.max(5, averageCpu)}%` }} 
                  />
                </div>
              </CardBody>
            </Card>

            {/* Metric 2: Registered Nodes */}
            <Card hoverable className="relative group">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#88909c] font-mono">Nodes</span>
                  <Badge status="online" label={`${onlineNodesCount} Active`} showPulse />
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-[#f3f0ea] tracking-tight font-title">{onlineNodesCount}</span>
                    <span className="text-xs text-[#565f6c] font-normal">/ {nodes.length} total</span>
                  </div>
                  <span className="text-xs text-[#88909c] font-medium">
                    {nodes.length > 0 ? `${Math.round((onlineNodesCount / nodes.length) * 100)}% online` : 'No nodes'}
                  </span>
                </div>

                {/* Visual Node Ratio Bar */}
                <div className="w-full bg-[#161a22] rounded-full h-1.5 overflow-hidden p-0.5 border border-white/[0.04]">
                  <div 
                    className="h-full bg-gradient-to-r from-[#10b981] to-[#38bdf8] rounded-full transition-all duration-500" 
                    style={{ width: `${nodes.length > 0 ? (onlineNodesCount / nodes.length) * 100 : 0}%` }} 
                  />
                </div>
              </CardBody>
            </Card>

            {/* Metric 3: Microservices */}
            <Card hoverable className="relative group">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#88909c] font-mono">Deployed Workloads</span>
                  <Badge status="running" label={`${runningServicesCount} Running`} showPulse />
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-[#f3f0ea] tracking-tight font-title">{runningServicesCount}</span>
                    <span className="text-xs text-[#565f6c] font-normal">/ {services.length} services</span>
                  </div>
                  <span className="text-xs text-[#88909c] font-medium">
                    {services.length > 0 ? `${Math.round((runningServicesCount / services.length) * 100)}% healthy` : 'No services'}
                  </span>
                </div>

                {/* Visual Services Ratio Bar */}
                <div className="w-full bg-[#161a22] rounded-full h-1.5 overflow-hidden p-0.5 border border-white/[0.04]">
                  <div 
                    className="h-full bg-gradient-to-r from-[#38bdf8] to-[#0284c7] rounded-full transition-all duration-500" 
                    style={{ width: `${services.length > 0 ? (runningServicesCount / services.length) * 100 : 0}%` }} 
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 🖥️ Hardware Nodes Status Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f3f0ea] tracking-tight flex items-center gap-2 font-title">
                <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
                Hardware Clusters &amp; Hypervisors
              </h2>
              <span className="text-[11px] text-[#88909c] font-mono">Live Telemetry · 4s poll</span>
            </div>

            {nodes.length === 0 ? (
              <EmptyState
                title="No Nodes Connected"
                description="No registered server nodes connected to this organization. Register a worker node to start deploying containers."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {nodes.map(node => (
                  <Card key={node.id} hoverable className={node.status === 'offline' ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div>
                        <CardTitle>{node.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-[#88909c] bg-[#161a22] px-2 py-0.5 rounded-md border border-white/[0.06]">
                            {node.ip}
                          </span>
                        </div>
                      </div>
                      <Badge status={node.status} showPulse />
                    </CardHeader>

                    <CardBody>
                      {node.status === 'online' ? (
                        <div className="space-y-3.5">
                          {/* CPU Gauge */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#88909c] font-medium">Processor (CPU)</span>
                              <span className="font-semibold text-[#ccc8be] font-mono text-[11.5px]">{node.cpu}%</span>
                            </div>
                            <div className="w-full bg-[#161a22] rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#0284c7] to-[#38bdf8] h-full rounded-full transition-all duration-300" 
                                style={{ width: `${node.cpu}%` }}
                              />
                            </div>
                          </div>

                          {/* Memory Gauge */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#88909c] font-medium">Memory (RAM)</span>
                              <span className="font-semibold text-[#ccc8be] font-mono text-[11.5px]">{node.memory}%</span>
                            </div>
                            <div className="w-full bg-[#161a22] rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] h-full rounded-full transition-all duration-300" 
                                style={{ width: `${node.memory}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#565f6c] italic py-3 text-center bg-[#161a22]/50 rounded-xl border border-dashed border-white/[0.06]">
                          Awaiting edge daemon connection handshake...
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
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  <CardTitle>Services</CardTitle>
                </div>
                <span className="text-xs text-[#88909c] font-mono">{services.length} registered</span>
              </CardHeader>

              <CardBody className="flex-1 flex flex-col justify-between">
                {services.length === 0 ? (
                  <p className="text-xs text-[#88909c] text-center py-12">No active services currently deployed.</p>
                ) : (
                  <div className="divide-y divide-white/[0.05] -my-2">
                    {services.map(service => (
                      <div key={service.id} className="py-3 flex items-center justify-between first:pt-2 last:pb-2 gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#f3f0ea] truncate">{service.name}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-[#161a22] border border-white/[0.06] text-[#ccc8be] font-mono">
                              {service.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-[#88909c] font-mono truncate">{service.endpoint}</span>
                            <button
                              onClick={() => copyToClipboard(service.endpoint)}
                              className="text-[10.5px] text-[#565f6c] hover:text-[#38bdf8] transition-colors cursor-pointer"
                              title="Copy Endpoint"
                            >
                              {copiedEndpoint === service.endpoint ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <Badge status={service.status} showPulse size="sm" />
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
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                  </svg>
                  <CardTitle>Aero Orchestrator Event Log</CardTitle>
                </div>
                
                {/* Filter Chips */}
                <div className="flex items-center gap-1 bg-[#161a22] p-1 rounded-lg border border-white/[0.06] text-[10.5px] font-mono">
                  {(['all', 'system', 'gateway', 'db'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
                        logFilter === f 
                          ? 'bg-[#38bdf8]/18 text-[#38bdf8] shadow-xs' 
                          : 'text-[#88909c] hover:text-[#ccc8be]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardBody className="flex-1 flex flex-col space-y-3">
                <div 
                  className="bg-[#0b0d11]/90 border border-white/[0.06] rounded-xl p-3.5 font-mono text-[11px] max-h-64 overflow-y-auto space-y-2 flex-1 shadow-inner" 
                  ref={logRef}
                >
                  {filteredLogs.length === 0 ? (
                    <div className="text-[#565f6c] text-center py-8 italic">No events match filter.</div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start leading-relaxed">
                        <span className="text-[#565f6c] shrink-0 font-mono text-[10.5px]">[{log.time}]</span>
                        <span className="text-[#38bdf8] shrink-0 font-medium">{log.service}:</span>
                        <span className={`flex-1 ${log.type === 'success' ? 'text-[#34d399]' : log.type === 'warn' ? 'text-[#fbbf24]' : 'text-[#ccc8be]'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 text-xs border-t border-white/[0.06]">
                  <span className="font-mono text-[#88909c] flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    fra-mesh-manager # ready
                  </span>
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => setLogs([{ time: new Date().toTimeString().split(' ')[0], service: 'system', message: 'Logger stream buffer refreshed.', type: 'info' }])}
                  >
                    Flush Stream Buffer
                  </Button>
                </div>
              </CardBody>
            </Card>

          </div>
        </>
      )}

    </div>
  );
}
