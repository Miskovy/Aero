'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { orgsService } from '@/services/api/orgs.service';
import { Organization } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomSelect from '@/components/CustomSelect';

const DEFAULT_ORGS: Organization[] = [
  { id: 'org-1', name: 'Core Infrastructure Org', tier: 'Enterprise Tier', membersCount: 8, projectsCount: 12, status: 'Active' },
  { id: 'org-2', name: 'Aero Dev Labs Team', tier: 'Developer Tier', membersCount: 3, projectsCount: 4, status: 'Active' }
];

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form inputs
  const [orgName, setOrgName] = useState('');
  const [orgTier, setOrgTier] = useState<Organization['tier']>('Developer Tier');

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orgsService.list();
      if (data && data.length > 0) {
        setOrgs(data);
      } else {
        const localData = localStorage.getItem('aero_local_orgs');
        if (localData) {
          setOrgs(JSON.parse(localData));
        } else {
          setOrgs(DEFAULT_ORGS);
          localStorage.setItem('aero_local_orgs', JSON.stringify(DEFAULT_ORGS));
        }
      }
    } catch (err: unknown) {
      console.warn('Backend org list warning:', err);
      const localData = localStorage.getItem('aero_local_orgs');
      setOrgs(localData ? JSON.parse(localData) : DEFAULT_ORGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchOrganizations();
    });
    return () => { active = false; };
  }, [fetchOrganizations]);

  const openCreateModal = () => {
    setModalMode('create');
    setOrgName('');
    setOrgTier('Developer Tier');
    setSelectedOrgId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setModalMode('edit');
    setOrgName(org.name);
    setOrgTier(org.tier);
    setSelectedOrgId(org.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await orgsService.create({ name: orgName, tier: orgTier, membersCount: 1, status: 'Active' });
      } else if (selectedOrgId) {
        await orgsService.update(selectedOrgId, { name: orgName, tier: orgTier });
      }
      fetchOrganizations();
      closeModal();
    } catch {
      // Local fallback in demo mode
      const updated = modalMode === 'create'
        ? [...orgs, { id: `org-${Date.now()}`, name: orgName, tier: orgTier, membersCount: 1, projectsCount: 0, status: 'Active' as const }]
        : orgs.map(o => o.id === selectedOrgId ? { ...o, name: orgName, tier: orgTier } : o);
      setOrgs(updated);
      localStorage.setItem('aero_local_orgs', JSON.stringify(updated));
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      await orgsService.delete(id);
      fetchOrganizations();
    } catch {
      const updated = orgs.filter(o => o.id !== id);
      setOrgs(updated);
      localStorage.setItem('aero_local_orgs', JSON.stringify(updated));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage workspace teams, access tiers, and resource limits across your cloud infrastructure."
        actions={
          <Button onClick={openCreateModal} variant="primary">
            + Create Organization
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={3} height="h-28" />
      ) : orgs.length === 0 ? (
        <EmptyState
          title="No Organizations Found"
          description="Create your first organization to start managing teams and deploying cloud services."
          actionLabel="Create Organization"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgs.map((org) => (
            <Card key={org.id} hoverable>
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{org.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{org.tier}</p>
                  </div>
                  <Badge status={org.status === 'Active' ? 'active' : 'inactive'} />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">Members</span>
                    <span className="text-slate-200 font-semibold">{org.membersCount} Users</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Projects</span>
                    <span className="text-slate-200 font-semibold">{org.projectsCount || 0} Apps</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(org)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(org.id)}>
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
        onClose={closeModal}
        title={modalMode === 'create' ? 'Create Organization' : 'Edit Organization'}
        subtitle="Organizations group teams, projects, and permissions under a single billing tier."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Organization Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Dev Team"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Access Tier</label>
            <CustomSelect
              value={orgTier}
              onChange={(val) => setOrgTier(val as Organization['tier'])}
              options={[
                { value: 'Developer Tier', label: 'Developer Tier (Basic limits)' },
                { value: 'Standard Tier', label: 'Standard Tier (Team features)' },
                { value: 'Enterprise Tier', label: 'Enterprise Tier (Unlimited & Priority)' }
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {modalMode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
