'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import StickFigureMeetingIllustration from '@/components/StickFigureMeetingIllustration';
import { Organization } from '@/types';
import { orgsService } from '@/services/api/orgs.service';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Form State (No Plan selection in modal; plan upgrades are in Subscriptions page)
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orgsService.list();
      setOrgs(data);
    } catch (err: unknown) {
      console.warn('Failed to fetch organizations:', err);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchOrganizations();
    });
    return () => { active = false; };
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedOrgId(null);
    setOrgName('');
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setModalMode('edit');
    setSelectedOrgId(org.id);
    setOrgName(org.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrgId(null);
    setOrgName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await orgsService.create({ name: orgName.trim() });
      } else if (selectedOrgId) {
        await orgsService.update(selectedOrgId, { name: orgName.trim() });
      }
      fetchOrganizations();
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      await orgsService.delete(id);
      fetchOrganizations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
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
        <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-xl text-[#f87171] text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={3} height="h-28" />
      ) : orgs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-8 sm:p-14 space-y-6">
          <div className="flex justify-center w-full max-w-lg mx-auto">
            <StickFigureMeetingIllustration width="100%" height={230} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold text-[#f3f0ea] tracking-tight font-title">
              No Organizations Found
            </h2>
            <p className="text-xs sm:text-sm text-[#88909c] leading-relaxed">
              Create your first organization to establish teams, provision hypervisor nodes, and deploy cloud services.
            </p>
          </div>

          <Button onClick={openCreateModal} variant="primary" size="md">
            + Create Organization
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgs.map((org) => (
            <Card key={org.id} hoverable>
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#f3f0ea] tracking-tight font-title">{org.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#38bdf8] font-medium font-mono">
                        {org.plan || org.tier || 'Developer Tier'}
                      </span>
                    </div>
                  </div>
                  <Badge status={org.status === 'Active' ? 'active' : 'inactive'} />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-[#161a22] rounded-lg border border-white/[0.06] text-xs">
                  <div>
                    <span className="text-[#88909c] block">Members</span>
                    <span className="text-[#f3f0ea] font-semibold">{org.membersCount || 1} Users</span>
                  </div>
                  <div>
                    <span className="text-[#88909c] block">Projects</span>
                    <span className="text-[#f3f0ea] font-semibold">{org.projectsCount || 0} Apps</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <Link
                    href={`/settings/subscriptions?orgId=${org.id}`}
                    className="text-xs font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
                  >
                    Upgrade Plan →
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(org)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(org.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Only organization name is entered here; plan upgrades occur in Subscriptions */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Create Organization' : 'Edit Organization'}
        subtitle="Organizations group teams, projects, and permissions. You can manage or upgrade subscription tiers anytime in Subscriptions."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#ccc8be] mb-1.5">
              Organization Name <span className="text-[#38bdf8]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Cloud Systems"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-lg text-sm text-[#f3f0ea] placeholder-[#565f6c] focus:outline-none focus:border-[#38bdf8]"
            />
          </div>

          <div className="p-3 bg-[#161a22]/60 rounded-xl border border-white/[0.06] text-xs text-[#88909c] flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              New organizations start on the <strong>Developer Tier (Free)</strong>. You can upgrade to higher compute quotas or team tiers in the Subscriptions page.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {modalMode === 'create' ? 'Create Organization' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
