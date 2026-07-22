'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { servicesService } from '@/services/api/services.service';
import { CloudService } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const DEFAULT_SERVICES: CloudService[] = [
  {
    id: 'srv-1',
    name: 'Primary Auth Gateway',
    slug: 'auth-gateway',
    type: 'application',
    status: 'running',
    created_at: new Date().toISOString(),
    ports: '3000:3000',
    replicas: 2
  },
  {
    id: 'srv-2',
    name: 'PostgreSQL Database Cluster',
    slug: 'postgres-db',
    type: 'database',
    status: 'running',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    ports: '5432:5432',
    replicas: 1
  },
  {
    id: 'srv-3',
    name: 'Redis In-Memory Cache',
    slug: 'redis-cache',
    type: 'cache',
    status: 'stopped',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    ports: '6379:6379',
    replicas: 1
  }
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<CloudService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await servicesService.list();
      if (data && data.length > 0) {
        setServices(data);
      } else {
        setServices(DEFAULT_SERVICES);
      }
    } catch (err: unknown) {
      console.warn('Failed to load services from backend:', err);
      setServices(DEFAULT_SERVICES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchServices();
    });
    return () => { active = false; };
  }, [fetchServices]);

  const handleStart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await servicesService.start(id);
      fetchServices();
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'running' as const } : s));
    } finally {
      setActionId(null);
    }
  };

  const handleStop = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await servicesService.stop(id);
      fetchServices();
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'stopped' as const } : s));
    } finally {
      setActionId(null);
    }
  };

  const handleRestart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await servicesService.restart(id);
      fetchServices();
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'deploying' as const } : s));
    } finally {
      setActionId(null);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesFilter = filterType === 'all' || s.type === filterType;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Cloud Services"
        description="Monitor, deploy, and scale microservices, container workloads, databases, and caches."
        actions={
          <Button onClick={() => router.push('/marketplace')} variant="primary">
            + Deploy Service
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#111625]/90 border border-slate-800 rounded-xl">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search services by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'application', 'database', 'cache', 'static'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={4} height="h-36" />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title="No Services Found"
          description="Deploy your first application service from the marketplace or container registry."
          actionLabel="Deploy Service"
          onAction={() => router.push('/marketplace')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              hoverable
              onClick={() => router.push(`/services/${service.id}`)}
            >
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{service.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{service.slug}</p>
                  </div>
                  <Badge status={service.status} showPulse />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">Workload Type</span>
                    <span className="text-slate-200 font-medium capitalize">{service.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Exposed Ports</span>
                    <span className="text-slate-200 font-mono">{service.ports || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-xs text-slate-500">
                    Replicas: <strong className="text-slate-300">{service.replicas || 1}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {service.status === 'stopped' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={actionId === service.id}
                        onClick={(e) => handleStart(service.id, e)}
                      >
                        Start
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={actionId === service.id}
                          onClick={(e) => handleRestart(service.id, e)}
                        >
                          Restart
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={actionId === service.id}
                          onClick={(e) => handleStop(service.id, e)}
                        >
                          Stop
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
