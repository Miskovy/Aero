'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CustomSelect from '../../components/CustomSelect';

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

export default function DashboardHome() {
  const [nodes, setNodes] = useState<ServerNode[]>([]);
  const [services, setServices] = useState<CloudService[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState([
    { time: '12:14:02', service: 'system', message: 'Heartbeat received from all active node clusters.', type: 'info' },
    { time: '12:14:15', service: 'aero-api-gateway', message: 'Route sync completed. 18 active routes indexed.', type: 'success' },
    { time: '12:14:38', service: 'aero-postgres-db', message: 'Background vacuum process finished (took 0.4s).', type: 'info' }
  ]);

  const logRef = useRef<HTMLDivElement>(null);
  const API_BASE = '/api';

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
      
      const orgsData = await orgsRes.json();
      setOrgs(orgsData);

      let activeOrgId = null;
      if (orgsData.length > 0) {
        const savedOrgId = localStorage.getItem('aero_active_org_id');
        const exists = orgsData.some((o: any) => o.id === savedOrgId);
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
        const servicesData = await servicesRes.json();
        setServices(servicesData.map((s: any) => ({
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
          const nodesData = await nodesRes.json();
          setNodes(nodesData.map((n: any) => ({
            id: n.id,
            name: n.name,
            ip: n.ip_address || 'N/A',
            cpu: n.resource_usage?.cpu || 10,
            memory: n.resource_usage?.memory || 20,
            status: n.status
          })));
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch nodes when org changes
  useEffect(() => {
    if (!selectedOrgId || loading) return;

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
          setNodes(data.map((n: any) => ({
            id: n.id,
            name: n.name,
            ip: n.ip_address || 'N/A',
            cpu: n.resource_usage?.cpu || 10,
            memory: n.resource_usage?.memory || 20,
            status: n.status
          })));
        }
      } catch (err) {
        console.error('Failed to reload nodes', err);
      }
    };

    fetchNodesForOrg();
  }, [selectedOrgId]);

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
          setServices(servicesData.map((s: any) => ({
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
    <div className="dashboard-content-grid" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* 🌟 Welcome / Overview Header */}
      <section className="dashboard-welcome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Platform Infrastructure
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            Monitor cluster nodes, control active static/gateway microservices, and watch global container orchestrations.
          </p>
        </div>

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
      </section>

      {/* 📊 High-Level Metrics Summary Deck */}
      <div className="summary-deck">
        <div className="deck-card">
          <span className="card-lbl">Global Cluster Load</span>
          <div className="card-val">
            {averageCpu}%
            <span className="trend positive">CPU Average</span>
          </div>
        </div>

        <div className="deck-card">
          <span className="card-lbl">Registered Nodes</span>
          <div className="card-val">
            {nodes.filter(n => n.status === 'online').length} <span className="dim">/ {nodes.length}</span>
            <span className="trend positive">Heartbeats Active</span>
          </div>
        </div>

        <div className="deck-card">
          <span className="card-lbl">Total Microservices</span>
          <div className="card-val">
            {services.filter(s => s.status === 'running').length} <span className="dim">/ {services.length}</span>
            <span className="trend neutral">Running Healthily</span>
          </div>
        </div>
      </div>

      {/* 🖥️ Nodes Status Grid */}
      <section className="section-block">
        <h2 className="section-title">Hardware Clusters & Hypervisors</h2>
        {nodes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>
            No registered server nodes connected to this organization.
          </div>
        ) : (
          <div className="nodes-grid">
            {nodes.map(node => (
              <div key={node.id} className={`node-flat-card ${node.status === 'offline' ? 'offline' : ''}`}>
                <div className="node-head">
                  <div>
                    <h3 className="node-name">{node.name}</h3>
                    <span className="node-ip">{node.ip}</span>
                  </div>
                  <span className={`status-badge ${node.status}`}>
                    {node.status}
                  </span>
                </div>

                {node.status === 'online' ? (
                  <div className="node-metrics">
                    <div className="metric-row">
                      <div className="metric-meta">
                        <span>Processor (CPU)</span>
                        <strong>{node.cpu}%</strong>
                      </div>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{ width: `${node.cpu}%` }}></div>
                      </div>
                    </div>

                    <div className="metric-row">
                      <div className="metric-meta">
                        <span>Memory (RAM)</span>
                        <strong>{node.memory}%</strong>
                      </div>
                      <div className="metric-bar">
                        <div className="metric-fill secondary" style={{ width: `${node.memory}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="node-offline-block">
                    Awaiting edge daemon connection handshakes...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 📦 Containers & Logs Double Column */}
      <div className="split-view">
        
        {/* Active Services Console */}
        <div className="split-column card-container">
          <h2 className="section-title compact">Deployed Core Microservices</h2>
          {services.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              No active services currently deployed.
            </div>
          ) : (
            <div className="services-list">
              {services.map(service => (
                <div key={service.id} className="service-row">
                  <div className="service-info">
                    <div className="service-headline">
                      <span className="service-name-txt">{service.name}</span>
                      <span className="service-tag">{service.type}</span>
                    </div>
                    <span className="service-link">{service.endpoint}</span>
                  </div>

                  <div className="service-controls">
                    <div className="service-status-meta">
                      <span className={`pulse-indicator ${service.status === 'running' ? 'online' : 'offline'}`}></span>
                      <span className="uptime-txt">{service.status === 'running' ? service.uptime : 'offline'}</span>
                    </div>
                    <button 
                      onClick={() => handleToggleService(service.id, service.status, service.name)} 
                      disabled={service.status === 'deploying' || service.status === 'building'}
                      className={`service-action-btn ${service.status === 'running' ? 'stop' : 'start'}`}
                    >
                      {service.status === 'running' ? 'Stop' : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time System Stream Console */}
        <div className="split-column card-container flex-col">
          <h2 className="section-title compact">Aero Orchestrator Event Log</h2>
          
          <div className="terminal-log-panel" ref={logRef}>
            {logs.map((log, idx) => (
              <div key={idx} className="log-line">
                <span className="log-time">[{log.time}]</span>
                <span className="log-service">{log.service}:</span>
                <span className={`log-msg ${log.type}`}>{log.message}</span>
              </div>
            ))}
          </div>

          <div className="terminal-footer">
            <span className="shell-indicator">fra-cluster-manager # ready</span>
            <button 
              onClick={() => setLogs([{ time: new Date().toTimeString().split(' ')[0], service: 'system', message: 'Logger logs history truncated.', type: 'info' }])}
              className="log-clear-btn"
            >
              Flush Stream Buffer
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

