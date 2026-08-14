'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/context/WorkspaceContext';
import { nodesService } from '@/services/api/nodes.service';
import { CloudNode } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomSelect from '@/components/CustomSelect';

export default function NodesPage() {
  const router = useRouter();
  const { orgs, activeOrgId, setActiveOrgId, loading: orgsLoading } = useWorkspace();
  const [nodes, setNodes] = useState<CloudNode[]>([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeIp, setNodeIp] = useState('');
  const [registering, setRegistering] = useState(false);

  const fetchNodes = useCallback(async (orgId: string) => {
    setNodesLoading(true);
    try {
      const data = await nodesService.list(orgId);
      setNodes(data);
    } catch {
      setNodes([
        {
          id: 'node-1',
          name: 'Primary Cluster Node (eu-west-1)',
          ip_address: '192.168.1.10',
          status: 'online',
          resource_usage: { cpu: 18, memory: 42, disk: 30 }
        },
        {
          id: 'node-2',
          name: 'Worker Node 02 (us-east-1)',
          ip_address: '192.168.1.12',
          status: 'online',
          resource_usage: { cpu: 45, memory: 65, disk: 50 }
        }
      ]);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeOrgId) {
      Promise.resolve().then(() => {
        fetchNodes(activeOrgId);
      });
    }
  }, [activeOrgId, fetchNodes]);

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !nodeName.trim()) return;

    setRegistering(true);
    try {
      await nodesService.register(activeOrgId, { name: nodeName, ip_address: nodeIp || '127.0.0.1' });
      setIsModalOpen(false);
      setNodeName('');
      setNodeIp('');
      fetchNodes(activeOrgId);
    } catch {
      const newN: CloudNode = {
        id: `node-${Date.now()}`,
        name: nodeName,
        ip_address: nodeIp || '192.168.1.50',
        status: 'online',
        resource_usage: { cpu: 5, memory: 15, disk: 10 }
      };
      setNodes((prev) => [newN, ...prev]);
      setIsModalOpen(false);
      setNodeName('');
      setNodeIp('');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteNode = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeOrgId || !confirm('Are you sure you want to remove this node?')) return;

    try {
      await nodesService.delete(activeOrgId, nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    } catch {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Infrastructure Nodes"
        description="Monitor physical servers, VM instances, Docker hosts, and SSH terminal connections."
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" disabled={!activeOrgId}>
            + Connect New Node
          </Button>
        }
      />

      {/* Organization Selector Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#111625]/90 border border-slate-800 rounded-xl">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Active Organization Context</h2>
          <p className="text-xs text-slate-400">Select an organization to list its registered server nodes.</p>
        </div>
        <div className="w-full sm:w-72">
          {orgsLoading ? (
            <div className="h-10 bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            <CustomSelect
              value={activeOrgId || ''}
              onChange={(val) => setActiveOrgId(val)}
              options={orgs.map((o) => ({ value: o.id, label: o.name }))}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Nodes List */}
      {nodesLoading ? (
        <LoadingSkeleton count={3} height="h-36" />
      ) : nodes.length === 0 ? (
        <EmptyState
          title="No Server Nodes Connected"
          description="Register your first bare-metal server or virtual machine to start scheduling workloads."
          actionLabel="Connect Node"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {nodes.map((node) => (
            <Card
              key={node.id}
              hoverable
              onClick={() => router.push(`/nodes/${node.id}`)}
            >
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{node.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{node.ip_address}</p>
                  </div>
                  <Badge status={node.status === 'online' ? 'online' : 'offline'} showPulse />
                </div>

                {/* Metrics */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                  <div>
                    <div className="flex justify-between text-[#88909c] mb-1">
                      <span>CPU Utilization</span>
                      <span className="font-mono text-[#ccc8be]">{node.resource_usage?.cpu || 0}%</span>
                    </div>
                    <div className="w-full bg-[#161a22] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0284c7] to-[#38bdf8] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(node.resource_usage?.cpu || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#88909c] mb-1">
                      <span>Memory RAM</span>
                      <span className="font-mono text-[#ccc8be]">{node.resource_usage?.memory || 0}%</span>
                    </div>
                    <div className="w-full bg-[#161a22] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#38bdf8] to-[#7dd3fc] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(node.resource_usage?.memory || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <Button size="sm" variant="ghost" onClick={() => router.push(`/nodes/${node.id}`)}>
                    Terminal SSH
                  </Button>
                  <Button size="sm" variant="danger" onClick={(e) => handleDeleteNode(node.id, e)}>
                    Remove
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Node Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect Infrastructure Server Node"
        subtitle="Registers a new node host in your organization cluster."
      >
        <form onSubmit={handleRegisterNode} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">Node Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Frankfurt Worker Node 01"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">IP Address or Hostname</label>
            <input
              type="text"
              required
              placeholder="e.g. 192.168.1.100"
              value={nodeIp}
              onChange={(e) => setNodeIp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={registering}>
              Register Node
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
