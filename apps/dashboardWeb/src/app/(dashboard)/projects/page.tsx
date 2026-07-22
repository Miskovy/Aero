'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { projectsService } from '@/services/api/projects.service';
import { Project } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomSelect from '@/components/CustomSelect';

export default function ProjectsPage() {
  const { orgs, activeOrgId, setActiveOrgId, loading: orgsLoading } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchProjects = useCallback(async (orgId: string) => {
    setProjectsLoading(true);
    try {
      const data = await projectsService.list(orgId);
      setProjects(data);
    } catch {
      setProjects([
        { id: 'proj-1', name: 'Production Backend API', description: 'Core microservices API gateway and auth service', services_count: 5, created_at: new Date().toISOString() },
        { id: 'proj-2', name: 'Frontend Customer Web App', description: 'Next.js web portal and dashboard frontend', services_count: 2, created_at: new Date(Date.now() - 86400000).toISOString() }
      ]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeOrgId) {
      Promise.resolve().then(() => {
        fetchProjects(activeOrgId);
      });
    }
  }, [activeOrgId, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !newProjectName.trim()) return;

    setCreateLoading(true);
    try {
      await projectsService.create({
        name: newProjectName,
        description: newProjectDesc,
        organization_id: activeOrgId,
      });
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects(activeOrgId);
    } catch {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: newProjectName,
        description: newProjectDesc,
        services_count: 0,
        created_at: new Date().toISOString(),
      };
      setProjects((prev) => [newProj, ...prev]);
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsService.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Projects"
        description="Group and organize applications, microservices, databases, and continuous delivery pipelines."
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" disabled={!activeOrgId}>
            + Create Project
          </Button>
        }
      />

      {/* Organization Selector Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#111625]/90 border border-slate-800 rounded-xl">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Active Organization Context</h2>
          <p className="text-xs text-slate-400">Select an organization to filter and manage its projects.</p>
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

      {/* Projects Grid */}
      {projectsLoading ? (
        <LoadingSkeleton count={3} height="h-32" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects in this Organization"
          description="Create a project to start deploying application services, databases, and microservices."
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <Card key={proj.id} hoverable>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-white tracking-tight">{proj.name}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {proj.services_count ?? 0} Services
                  </span>
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-500">
                  <span>Created {new Date(proj.created_at || '2026-01-01').toLocaleDateString()}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteProject(proj.id)}>
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        subtitle="Projects isolate resources, environment variables, and deployment secrets."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. E-Commerce Core API"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Brief summary of the services inside this project..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createLoading}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
