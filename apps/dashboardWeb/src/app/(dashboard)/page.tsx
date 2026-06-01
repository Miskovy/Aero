"use client";

import React, { useState, useEffect, useRef } from 'react';

// Define TS Interfaces for our UI models
interface AeroNode {
  id: string;
  name: string;
  ip: string;
  cpu: number;
  memory: number;
  status: 'online' | 'offline' | 'draining';
}

interface AeroService {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'deploying';
  port: number;
}

export default function DashboardHome() {
  // --- Active Tab State (For the React Tutorial Panel) ---
  const [activeTab, setActiveTab] = useState<'state' | 'effect' | 'rsc'>('state');

  // --- 1. React State Classroom Variables ---
  const [nodes, setNodes] = useState<AeroNode[]>([
    { id: '1', name: 'MacStudio-M2-Pro', ip: '192.168.1.100', cpu: 12, memory: 34, status: 'online' },
    { id: '2', name: 'Ubuntu-Home-Rack', ip: '192.168.1.155', cpu: 48, memory: 72, status: 'online' },
    { id: '3', name: 'Pi-Edge-Collector', ip: '10.0.0.45', cpu: 0, memory: 0, status: 'offline' }
  ]);
  const [newNodeName, setNewNodeName] = useState('');

  // Handler to add a node (demonstrates useState array manipulation)
  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const node: AeroNode = {
      id: Date.now().toString(),
      name: newNodeName,
      ip: `192.168.1.${Math.floor(Math.random() * 200) + 10}`,
      cpu: 0,
      memory: 0,
      status: 'online'
    };

    setNodes([...nodes, node]);
    setNewNodeName('');
  };

  // --- 2. React Effect Classroom Variables ---
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [simulatedMetrics, setSimulatedMetrics] = useState({ cpu: 22, memory: 45 });
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (!isPollingActive) return;

    // Start polling interval
    const interval = setInterval(() => {
      setSimulatedMetrics({
        cpu: Math.floor(Math.random() * 65) + 15,
        memory: Math.floor(Math.random() * 20) + 40
      });
      setPollingCount((count) => count + 1);
    }, 2000);

    // Cleanup phase: crucial to avoid memory leaks when effect unmounts or state changes
    return () => {
      clearInterval(interval);
    };
  }, [isPollingActive]); // Dependency array: triggers effect when isPollingActive changes

  // --- 3. Simulated Console (Applying React to the Dashboard) ---
  const [services, setServices] = useState<AeroService[]>([
    { id: 's1', name: 'aero-api-gateway', type: 'application', status: 'running', port: 3000 },
    { id: 's2', name: 'aero-postgres-db', type: 'database', status: 'running', port: 5432 },
    { id: 's3', name: 'static-docs-portal', type: 'static', status: 'stopped', port: 8080 }
  ]);

  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; text: string; level: 'info' | 'success' | 'warn' | 'error' }>>([
    { time: '14:02:11', text: 'Initializing Docker Daemon connection on HomeServer...', level: 'info' },
    { time: '14:02:12', text: 'Docker Engine running. API connection OK.', level: 'success' }
  ]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Handle service start / stop
  const toggleService = (serviceId: string) => {
    setServices(services.map(s => {
      if (s.id === serviceId) {
        const nextStatus = s.status === 'running' ? 'stopped' : 'running';
        
        // Log action to console terminal
        const timestamp = new Date().toTimeString().split(' ')[0];
        const logLine = nextStatus === 'running' 
          ? { time: timestamp, text: `Triggered start for service [${s.name}]. Containers launching...`, level: 'info' as const }
          : { time: timestamp, text: `Gracefully stopped service [${s.name}]. Container removed.`, level: 'warn' as const };
        
        setTerminalLogs(prev => [...prev, logLine]);

        // If starting, simulate building/deploying process
        if (nextStatus === 'running') {
          setTimeout(() => {
            setTerminalLogs(prev => [
              ...prev,
              { time: new Date().toTimeString().split(' ')[0], text: `Service [${s.name}] successfully started. Listening on port ${s.port}`, level: 'success' as const }
            ]);
          }, 1500);
        }

        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Intro Header */}
      <section style={{ marginBottom: '40px' }}>
        <h1>Aero Cloud Developer Console</h1>
        <p className="subtitle">
          Learn core React concepts and practice building real-time dashboard controllers side-by-side.
        </p>
      </section>

      {/* REACT CLASSROOM TABS PANEL */}
      <section className="tab-container">
        <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '1px' }}>
          CORE REACT CLASSROOM & PLAYGROUND
        </div>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '16px' }}>
          Interactive Step-by-Step Tutorials
        </h2>

        {/* Tab Header Navigation */}
        <div className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'state' ? 'active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            1. State Management (useState)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'effect' ? 'active' : ''}`}
            onClick={() => setActiveTab('effect')}
          >
            2. Side Effects & Polling (useEffect)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rsc' ? 'active' : ''}`}
            onClick={() => setActiveTab('rsc')}
          >
            3. Server Components (Next.js RSC)
          </button>
        </div>

        {/* Tab 1 Content: State */}
        {activeTab === 'state' && (
          <div className="flex-split">
            {/* Live Interactive Box */}
            <div className="interactive-demo">
              <h3 style={{ marginBottom: '12px', color: 'var(--accent-cyan)' }}>Interactive Spawner</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                State lets a React component remember inputs. Submit the form to append a new Node to the reactive array state.
              </p>

              <form onSubmit={handleAddNode} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  value={newNodeName} 
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="Enter server hostname..." 
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>
                  Register Node
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Node State List:</strong>
                {nodes.map(n => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                    <span>🖥️ {n.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{n.ip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanatory Code Side */}
            <div className="code-viewer">
              <span className="code-badge">React 19 State</span>
              <pre>{`// State Classroom Code Example
import { useState } from 'react';

export default function NodeSpawner() {
  // Array state storing registered hardware nodes
  const [nodes, setNodes] = useState([
    { id: '1', name: 'MacStudio-M2' }
  ]);
  const [newNodeName, setNewNodeName] = useState('');

  const addNode = (e) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    // Create copy of array and append new node
    setNodes([...nodes, { 
      id: Date.now().toString(), 
      name: newNodeName 
    }]);
    setNewNodeName(''); // Reset input
  };

  return (
    <form onSubmit={addNode}>
      <input 
        value={newNodeName} 
        onChange={(e) => setNewNodeName(e.target.value)} 
      />
      <button>Register Node</button>
    </form>
  );
}`}</pre>
            </div>
          </div>
        )}

        {/* Tab 2 Content: useEffect */}
        {activeTab === 'effect' && (
          <div className="flex-split">
            {/* Live Interactive Box */}
            <div className="interactive-demo">
              <h3 style={{ marginBottom: '12px', color: 'var(--accent-purple)' }}>Side-Effect Metrics Poller</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Toggle the switch to register a `setInterval` that polls mock CPU and Memory metrics every 2 seconds. When toggled off, the cleanup function destroys the interval to prevent resource leaks!
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button 
                  className={`btn-primary`} 
                  style={{
                    background: isPollingActive ? 'linear-gradient(135deg, var(--accent-red), #b91c1c)' : 'linear-gradient(135deg, var(--accent-green), #047857)',
                    boxShadow: isPollingActive ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(16,185,129,0.2)'
                  }}
                  onClick={() => setIsPollingActive(!isPollingActive)}
                >
                  {isPollingActive ? 'Stop Metrics Polling' : 'Start Metrics Polling'}
                </button>
                <div style={{ fontSize: '14px' }}>
                  Polls triggered: <strong style={{ color: 'var(--accent-cyan)' }}>{pollingCount}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Simulated Host CPU</span>
                    <strong>{simulatedMetrics.cpu}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${simulatedMetrics.cpu}%`, background: 'var(--accent-purple)' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Simulated Host Memory</span>
                    <strong>{simulatedMetrics.memory}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${simulatedMetrics.memory}%`, background: 'var(--accent-purple)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory Code Side */}
            <div className="code-viewer">
              <span className="code-badge">Side Effects</span>
              <pre>{`// Side Effect Classroom Code Example
import { useState, useEffect } from 'react';

export function MetricsPoller({ active }) {
  const [metrics, setMetrics] = useState({ cpu: 0 });

  useEffect(() => {
    // 1. Exit early if polling is disabled
    if (!active) return;

    // 2. Setup Phase: Spin up interval for simulated API
    const timer = setInterval(() => {
      setMetrics({ cpu: Math.floor(Math.random() * 100) });
    }, 2000);

    // 3. Cleanup Phase: MUST cancel the timer!
    // Prevents performance decay and ghost polling
    return () => {
      clearInterval(timer);
    };
  }, [active]); // Re-runs setup/cleanup when "active" status toggles

  return <div>CPU Metric: {metrics.cpu}%</div>;
}`}</pre>
            </div>
          </div>
        )}

        {/* Tab 3 Content: RSC */}
        {activeTab === 'rsc' && (
          <div className="flex-split">
            {/* Live Interactive Box */}
            <div className="interactive-demo" style={{ justifyContent: 'flex-start' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--accent-orange)' }}>Next.js Server Architecture</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Next.js components are server-first. This architecture speeds up load times and keeps API keys completely secure.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(6, 182, 212, 0.05)' }}>
                  <h4 style={{ fontSize: '14px', color: '#ffffff', marginBottom: '4px' }}>🖥️ React Server Components (RSC)</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Runs on the server. Directly accesses DBs, private microservices, and loads initial HTML layout without hydration delays.
                  </p>
                </div>
                <div style={{ border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
                  <h4 style={{ fontSize: '14px', color: '#ffffff', marginBottom: '4px' }}>📱 Client Components (`"use client"`)</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Sent to the browser. Handles state (`useState`), user-triggered animations (`framer-motion`), browser events (`onClick`), and WebSocket connections.
                  </p>
                </div>
              </div>
            </div>

            {/* Explanatory Code Side */}
            <div className="code-viewer">
              <span className="code-badge">RSC Concept</span>
              <pre>{`// RSC + Client Hybrid Architecture Example

// 1. src/app/dashboard/page.tsx (Server Component)
import { NodeGrid } from '@/components/NodeGrid';

// Directly queries backend server. Completely secure!
async function getRawDatabaseNodes() {
  const res = await fetch('http://api-internal/nodes');
  return res.json();
}

export default async function Dashboard() {
  const initialNodes = await getRawDatabaseNodes();
  return (
    <div>
      <h1>Infrastructure</h1>
      {/* RSC rendering interactive client element */}
      <NodeGrid data={initialNodes} />
    </div>
  );
}`}</pre>
            </div>
          </div>
        )}
      </section>

      {/* THE LIVE AERO CLOUD CONSOLE WIDGET */}
      <section style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="indicator-pulse online"></span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '1px' }}>
            APPLYING REACT IN A REAL-WORLD UI
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '28px', marginBottom: '24px' }}>
          Aero Cloud Orchestration Dashboard
        </h2>

        {/* Node Metrics Cards Grid */}
        <div className="grid-cols-3">
          {nodes.map(node => (
            <div className="dashboard-card" key={node.id}>
              <div className="card-header">
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  IP: {node.ip}
                </span>
                <span className={`indicator-pulse ${node.status === 'online' ? 'online' : 'failed'}`}></span>
              </div>
              <div className="card-title" style={{ marginBottom: '16px' }}>🖥️ {node.name}</div>
              
              {node.status === 'online' ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Active CPU Threads</span>
                      <strong>{node.id === '1' || node.id === '2' ? (isPollingActive ? simulatedMetrics.cpu : node.cpu) : 0}%</strong>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${node.id === '1' || node.id === '2' ? (isPollingActive ? simulatedMetrics.cpu : node.cpu) : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>RAM Allocation</span>
                      <strong>{node.id === '1' || node.id === '2' ? (isPollingActive ? simulatedMetrics.memory : node.memory) : 0}%</strong>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${node.id === '1' || node.id === '2' ? (isPollingActive ? simulatedMetrics.memory : node.memory) : 0}%`, background: 'var(--accent-blue)' }}></div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '13px', fontStyle: 'italic', marginTop: '16px' }}>
                  Node offline. Awaiting connection heartbeat from daemon...
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Services Controllers & Sim Logs */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '32px' }}>
          
          {/* Services Table */}
          <div style={{ flex: 1.2, minWidth: '320px', backgroundColor: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius)', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📦 Running Services</span>
              <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                {services.filter(s => s.status === 'running').length} / {services.length} Active
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {services.map(service => (
                <div key={service.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>{service.name}</strong>
                      <span style={{ fontSize: '10px', backgroundColor: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        Port {service.port}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Type: {service.type}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`indicator-pulse ${service.status === 'running' ? 'online' : 'failed'}`} style={{ width: '8px', height: '8px' }}></span>
                      <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{service.status}</span>
                    </div>
                    
                    <button 
                      className="btn-secondary" 
                      onClick={() => toggleService(service.id)}
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px' }}
                    >
                      {service.status === 'running' ? 'Stop' : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Docker Live Console logs */}
          <div style={{ flex: 1.5, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
            <div className="terminal-shell" style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="terminal-topbar">
                <div className="terminal-title">
                  <span>💻</span>
                  <span>Aero Docker Log Console</span>
                </div>
                <div className="terminal-dots">
                  <span className="terminal-dot" style={{ backgroundColor: '#f87171' }}></span>
                  <span className="terminal-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                  <span className="terminal-dot" style={{ backgroundColor: '#4ade80' }}></span>
                </div>
              </div>

              <div 
                className="terminal-body-content" 
                ref={logContainerRef} 
                style={{ flex: 1, height: '260px' }}
              >
                {terminalLogs.map((log, index) => (
                  <div key={index} className="terminal-line">
                    <span className="line-time">[{log.time}]</span>
                    <span className={`line-text ${log.level}`}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => {
                setTerminalLogs([
                  { time: new Date().toTimeString().split(' ')[0], text: 'Cleared local logger memory.', level: 'info' }
                ]);
              }}
              style={{ alignSelf: 'flex-end', marginTop: '12px', padding: '6px 14px', fontSize: '11px', borderRadius: '4px' }}
            >
              🧹 Clear Console Buffer
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
