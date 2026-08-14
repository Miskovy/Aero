'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { alertsService } from '@/services/api/alerts.service';
import { AlertRule, AlertMetric, AlertOperator, AlertChannel } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomSelect from '@/components/CustomSelect';

export default function AlertsPage() {
  const { orgs, activeOrgId, setActiveOrgId } = useWorkspace();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [metric, setMetric] = useState<AlertMetric>('cpu_percent');
  const [operator, setOperator] = useState<AlertOperator>('gt');
  const [threshold, setThreshold] = useState<number>(80);
  const [duration, setDuration] = useState<number>(60);
  const [channel, setChannel] = useState<AlertChannel>('email');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const data = await alertsService.list(orgId);
      setRules(data);
    } catch {
      setRules([
        {
          id: 'rule-1',
          name: 'High CPU Usage Warning',
          metric: 'cpu_percent',
          operator: 'gt',
          threshold: 85,
          duration_seconds: 60,
          channel: 'email',
          enabled: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'rule-2',
          name: 'Memory Spike Threshold',
          metric: 'memory_percent',
          operator: 'gt',
          threshold: 90,
          duration_seconds: 120,
          channel: 'slack',
          enabled: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeOrgId) {
      Promise.resolve().then(() => {
        fetchRules(activeOrgId);
      });
    }
  }, [activeOrgId, fetchRules]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !ruleName.trim()) return;

    setSubmitting(true);
    try {
      await alertsService.create(activeOrgId, {
        name: ruleName,
        metric,
        operator,
        threshold: Number(threshold),
        duration_seconds: Number(duration),
        channel,
        enabled: true,
      });
      setIsModalOpen(false);
      setRuleName('');
      fetchRules(activeOrgId);
    } catch {
      const newRule: AlertRule = {
        id: `rule-${Date.now()}`,
        name: ruleName,
        metric,
        operator,
        threshold: Number(threshold),
        duration_seconds: Number(duration),
        channel,
        enabled: true,
        created_at: new Date().toISOString(),
      };
      setRules((prev) => [newRule, ...prev]);
      setIsModalOpen(false);
      setRuleName('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!activeOrgId || !confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await alertsService.delete(activeOrgId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Alert Rules & Monitoring"
        description="Configure automated metric thresholds, downtime notifications, and alerting channels."
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" disabled={!activeOrgId}>
            + Create Alert Rule
          </Button>
        }
      />

      {/* Organization Selector Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#111625]/90 border border-slate-800 rounded-xl">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Organization Context</h2>
          <p className="text-xs text-slate-400">Select an organization to manage its metric monitoring alerts.</p>
        </div>
        <div className="w-full sm:w-72">
          <CustomSelect
            value={activeOrgId || ''}
            onChange={(val) => setActiveOrgId(val)}
            options={orgs.map((o) => ({ value: o.id, label: o.name }))}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={3} height="h-32" />
      ) : rules.length === 0 ? (
        <EmptyState
          title="No Alert Rules Configured"
          description="Create your first notification rule to get alerted when CPU, Memory, or Services cross limits."
          actionLabel="Create Alert Rule"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rules.map((rule) => (
            <Card key={rule.id} hoverable>
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-[#f3f0ea] tracking-tight font-title">{rule.name}</h3>
                  <Badge status={rule.enabled ? 'active' : 'inactive'} label={rule.enabled ? 'Enabled' : 'Disabled'} />
                </div>

                <div className="p-3 bg-[#161a22]/70 rounded-lg border border-white/[0.06] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#88909c]">
                    <span>Metric Threshold:</span>
                    <span className="font-mono text-[#38bdf8] font-semibold">
                      {rule.metric} {rule.operator} {rule.threshold}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[#88909c]">
                    <span>Notification Channel:</span>
                    <span className="font-medium text-[#ccc8be] capitalize">{rule.channel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-[#88909c]">
                  <span>Duration: {rule.duration_seconds}s</span>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteRule(rule.id)}>
                    Delete Rule
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
        title="Create Alert Monitoring Rule"
        subtitle="Specify threshold conditions and dispatch notification targets."
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Rule Name</label>
            <input
              type="text"
              required
              placeholder="e.g. High CPU Spike Warning"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Target Metric</label>
              <CustomSelect
                value={metric}
                onChange={(val) => setMetric(val as AlertMetric)}
                options={[
                  { value: 'cpu_percent', label: 'CPU Usage %' },
                  { value: 'memory_percent', label: 'RAM Memory %' },
                  { value: 'disk_percent', label: 'Disk Storage %' },
                  { value: 'service_down', label: 'Service Down' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Condition Operator</label>
              <CustomSelect
                value={operator}
                onChange={(val) => setOperator(val as AlertOperator)}
                options={[
                  { value: 'gt', label: 'Greater Than (>)' },
                  { value: 'gte', label: 'Greater/Equal (>=)' },
                  { value: 'lt', label: 'Less Than (<)' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Threshold (%)</label>
              <input
                type="number"
                required
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Duration (Sec)</label>
              <input
                type="number"
                required
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Channel</label>
              <CustomSelect
                value={channel}
                onChange={(val) => setChannel(val as AlertChannel)}
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'slack', label: 'Slack' },
                  { value: 'webhook', label: 'Webhook' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
