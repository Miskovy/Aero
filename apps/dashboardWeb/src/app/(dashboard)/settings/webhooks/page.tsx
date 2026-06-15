'use client';

import React, { useState, useEffect } from 'react';
import WebhooksManager from '@/components/WebhooksManager';
import CustomSelect from '@/components/CustomSelect';

interface Service {
  id: string;
  name: string;
  slug: string;
}

export default function WebhooksPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api';

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const v = `; ${document.cookie}`;
    const p = v.split('; aero_session=');
    if (p.length === 2) return p.pop()?.split(';').shift() || null;
    return null;
  };

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/services`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setServices(data);
        if (data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const selectOptions = services.map(s => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '6px' }}>Webhooks</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '32px' }}>
        Configure webhook endpoints to receive real-time event notifications from your deployments.
      </p>

      {loading ? (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '48px', display: 'flex', justifyContent: 'center' }}>
          <div className="throbber" />
        </div>
      ) : error ? (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '24px', color: '#f87171' }}>
          <p>Failed to load services: {error}</p>
        </div>
      ) : services.length === 0 ? (
        <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '48px', textAlign: 'center' }}>
          <svg style={{ color: 'var(--text-dim)', marginBottom: '16px' }} width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            NO SERVICES FOUND
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
            You must create at least one service before configuring webhook endpoints.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Service Selector */}
          <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Service</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Choose which service to manage webhooks for.</p>
            </div>
            
            <CustomSelect
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              options={selectOptions}
              style={{ width: '240px' }}
            />
          </div>

          {/* Webhooks Manager */}
          {selectedServiceId && (
            <div className="metric-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: '24px' }}>
              <WebhooksManager serviceId={selectedServiceId} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
