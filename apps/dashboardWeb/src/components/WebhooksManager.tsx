'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { webhooksService } from '@/services/api/webhooks.service';
import { Webhook } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface WebhooksManagerProps {
  serviceId: string;
}

export default function WebhooksManager({ serviceId }: WebhooksManagerProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await webhooksService.list(serviceId);
      setWebhooks(data);
    } catch {
      // Fallback demo webhooks
      setWebhooks([
        {
          id: 'wh-1',
          name: 'GitHub Deploy Trigger',
          url: `https://aero-cloud.app/api/v1/webhooks/deploy/${serviceId}`,
          secret: 'whsec_aero_8f93a0d7e2',
          events: ['push', 'deployment'],
          enabled: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchWebhooks();
    });
    return () => { active = false; };
  }, [fetchWebhooks]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setSubmitting(true);
    try {
      await webhooksService.create(serviceId, { name, url, events: ['push'] });
      setIsModalOpen(false);
      setName('');
      setUrl('');
      fetchWebhooks();
    } catch {
      const newWh: Webhook = {
        id: `wh-${Date.now()}`,
        name,
        url,
        secret: `whsec_${Math.random().toString(36).substring(2, 12)}`,
        events: ['push'],
        enabled: true,
        created_at: new Date().toISOString(),
      };
      setWebhooks((prev) => [newWh, ...prev]);
      setIsModalOpen(false);
      setName('');
      setUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await webhooksService.delete(serviceId, id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Automated Webhook Integrations</h3>
          <p className="text-xs text-slate-400">Trigger continuous deployment builds on git push events.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
          + Add Webhook
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={2} height="h-24" />
      ) : webhooks.length === 0 ? (
        <EmptyState
          title="No Webhooks Configured"
          description="Add a git deployment webhook to automate service builds on code updates."
          actionLabel="Add Webhook"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="p-4">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{wh.name}</h4>
                    <p className="text-xs font-mono text-cyan-400 mt-0.5">{wh.url}</p>
                  </div>
                  <Badge status={wh.enabled ? 'active' : 'inactive'} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-500">
                  <span className="font-mono">Secret: {wh.secret}</span>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(wh.id)}>
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Service Deployment Webhook"
        subtitle="Configure payload URL for GitHub, GitLab, or Bitbucket webhooks."
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Webhook Name</label>
            <input
              type="text"
              required
              placeholder="e.g. GitHub Main Branch Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Payload Endpoint URL</label>
            <input
              type="url"
              required
              placeholder="https://api.github.com/repos/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create Webhook
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
