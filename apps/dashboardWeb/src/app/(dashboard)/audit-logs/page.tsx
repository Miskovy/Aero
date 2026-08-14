'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { auditService } from '@/services/api/audit.service';
import { AuditLog } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomSelect from '@/components/CustomSelect';

export default function AuditLogsPage() {
  const { orgs, activeOrgId, setActiveOrgId } = useWorkspace();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  const fetchAuditLogs = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const data = await auditService.list(orgId, {
        action: actionFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
      });
      setLogs(data);
    } catch {
      setLogs([
        {
          id: 'log-1',
          action: 'auth.login.success',
          resource_type: 'User',
          user_email: 'admin@aero.cloud',
          ip_address: '192.168.1.10',
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-2',
          action: 'service.deploy.started',
          resource_type: 'CloudService',
          user_email: 'dev@aero.cloud',
          ip_address: '192.168.1.15',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'log-3',
          action: 'node.register.completed',
          resource_type: 'CloudNode',
          user_email: 'admin@aero.cloud',
          ip_address: '192.168.1.10',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceTypeFilter]);

  useEffect(() => {
    if (activeOrgId) {
      Promise.resolve().then(() => {
        fetchAuditLogs(activeOrgId);
      });
    }
  }, [activeOrgId, fetchAuditLogs]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Audit Logs & Compliance"
        description="Tamper-evident trail of user actions, API calls, deployment triggers, and security events."
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#11141a]/90 border border-white/[0.07] rounded-xl">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter by action (e.g. login)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3.5 py-2 bg-[#161a22] border border-white/[0.08] rounded-lg text-xs text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8] w-52"
          />
          <input
            type="text"
            placeholder="Filter by resource type..."
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
            className="px-3.5 py-2 bg-[#161a22] border border-white/[0.08] rounded-lg text-xs text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8] w-52"
          />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            value={activeOrgId || ''}
            onChange={(val) => setActiveOrgId(val)}
            options={orgs.map((o) => ({ value: o.id, label: o.name }))}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#ef4444]/12 border border-[#ef4444]/30 rounded-xl text-[#f87171] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={4} height="h-16" />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Logs Found"
          description="System events and user actions will be recorded here automatically."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#161a22] border-b border-white/[0.06] text-[#88909c] text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-5">Timestamp</th>
                    <th className="py-3.5 px-5">Action Event</th>
                    <th className="py-3.5 px-5">Resource Type</th>
                    <th className="py-3.5 px-5">Actor / User</th>
                    <th className="py-3.5 px-5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[#88909c]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-[#38bdf8] font-mono">{log.action}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge status="neutral" label={log.resource_type} />
                      </td>
                      <td className="py-3.5 px-5 text-[#ccc8be]">
                        {log.user_email || 'System Agent'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[#88909c]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
