'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ServerNode {
  id: string;
  name: string;
  ip: string;
  cpu: number;
  memory: number;
  status: 'online' | 'offline' | 'degraded';
}

interface CloudService {
  id: string;
  name: string;
  type: 'gateway' | 'database' | 'static' | 'worker';
  status: 'running' | 'stopped' | 'deploying';
  uptime: string;
  endpoint: string;
}

export default function DashboardHome() {
  const [nodes, setNodes] = useState<ServerNode[]>([
    { id: 'n1', name: 'fra-node-core-01', ip: '138.197.80.45', cpu: 14, memory: 42, status: 'online' },
    { id: 'n2', name: 'nyc-node-edge-02', ip: '159.203.170.82', cpu: 28, memory: 58, status: 'online' },
    { id: 'n3', name: 'ams-node-db-01', ip: '142.93.220.101', cpu: 8, memory: 74, status: 'online' },
    { id: 'n4', name: 'sgp-node-backup', ip: '128.199.160.12', cpu: 0, memory: 0, status: 'offline' }
  ]);

  const [services, setServices] = useState<CloudService[]>([
    { id: 's1', name: 'aero-api-gateway', type: 'gateway', status: 'running', uptime: '14d 8h', endpoint: 'api.aero.dev' },
    { id: 's2', name: 'aero-postgres-db', type: 'database', status: 'running', uptime: '32d 12h', endpoint: 'db.internal:5432' },
    { id: 's3', name: 'aero-web-dashboard', type: 'static', status: 'running', uptime: '6d 21h', endpoint: 'console.aero.dev' },
    { id: 's4', name: 'image-processing-worker', type: 'worker', status: 'stopped', uptime: '0s', endpoint: 'worker.internal' }
  ]);

  const [logs, setLogs] = useState([
    { time: '12:14:02', service: 'system', message: 'Heartbeat received from all active node clusters.', type: 'info' },
    { time: '12:14:15', service: 'aero-api-gateway', message: 'Route sync completed. 18 active routes indexed.', type: 'success' },
    { time: '12:14:38', service: 'aero-postgres-db', message: 'Background vacuum process finished (took 0.4s).', type: 'info' }
  ]);

  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulate active host telemetry fluctuations
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
      ].slice(-50)); // Cap logs size
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleService = (id: string) => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'running' ? 'stopped' : 'running';
        const logTime = new Date().toTimeString().split(' ')[0];
        
        setLogs(l => [
          ...l,
          {
            time: logTime,
            service: s.name,
            message: nextStatus === 'running' ? 'Service manual trigger: startup initiated.' : 'Service manual trigger: graceful shutdown initiated.',
            type: nextStatus === 'running' ? 'success' : 'warn'
          }
        ]);

        return {
          ...s,
          status: nextStatus,
          uptime: nextStatus === 'running' ? '1s' : '0s'
        };
      }
      return s;
    }));
  };

  return (
    <div className="dashboard-content-grid" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* 🌟 Welcome / Overview Header */}
      <section className="dashboard-welcome">
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>
          Platform Infrastructure
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
          Monitor cluster nodes, control active static/gateway microservices, and watch global container orchestrations.
        </p>
      </section>

      {/* 📊 High-Level Metrics Summary Deck */}
      <div className="summary-deck">
        <div className="deck-card">
          <span className="card-lbl">Global Cluster Load</span>
          <div className="card-val">
            {Math.round(nodes.filter(n => n.status === 'online').reduce((acc, curr) => acc + curr.cpu, 0) / nodes.filter(n => n.status === 'online').length)}%
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

              {node.status !== 'offline' ? (
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
      </section>

      {/* 📦 Containers & Logs Double Column */}
      <div className="split-view">
        
        {/* Active Services Console */}
        <div className="split-column card-container">
          <h2 className="section-title compact">Deployed Core Microservices</h2>
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
                    <span className={`pulse-indicator ${service.status}`}></span>
                    <span className="uptime-txt">{service.status === 'running' ? service.uptime : 'offline'}</span>
                  </div>
                  <button 
                    onClick={() => handleToggleService(service.id)} 
                    className={`service-action-btn ${service.status === 'running' ? 'stop' : 'start'}`}
                  >
                    {service.status === 'running' ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
