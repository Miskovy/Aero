'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orgsService } from '@/services/api/orgs.service';
import { projectsService } from '@/services/api/projects.service';
import { Organization, Project } from '@/types';

interface WorkspaceContextType {
  orgs: Organization[];
  projects: Project[];
  activeOrg: Organization | null;
  activeProject: Project | null;
  activeOrgId: string | null;
  activeProjectId: string | null;
  loading: boolean;
  projectsLoading: boolean;
  error: string | null;
  setActiveOrgId: (id: string) => void;
  setActiveProjectId: (id: string | null) => void;
  refreshOrgs: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const DEFAULT_ORGS: Organization[] = [
  { id: 'org-1', name: 'Core Infrastructure Org', tier: 'Enterprise Tier', membersCount: 8, projectsCount: 12, status: 'Active' },
  { id: 'org-2', name: 'Aero Dev Labs Team', tier: 'Developer Tier', membersCount: 3, projectsCount: 4, status: 'Active' }
];

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orgsService.list();
      if (data && data.length > 0) {
        setOrgs(data);
      } else {
        const localData = localStorage.getItem('aero_local_orgs');
        const initialOrgs = localData ? JSON.parse(localData) : DEFAULT_ORGS;
        setOrgs(initialOrgs);
        if (!localData) localStorage.setItem('aero_local_orgs', JSON.stringify(DEFAULT_ORGS));
      }
    } catch {
      const localData = localStorage.getItem('aero_local_orgs');
      setOrgs(localData ? JSON.parse(localData) : DEFAULT_ORGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectsForOrg = useCallback(async (orgId: string) => {
    setProjectsLoading(true);
    try {
      const data = await projectsService.list(orgId);
      setProjects(data);
      if (data.length > 0) {
        const savedProjId = localStorage.getItem('aero_active_project_id');
        const exists = data.some(p => p.id === savedProjId);
        setActiveProjectIdState(exists ? savedProjId : data[0].id);
      } else {
        setActiveProjectIdState(null);
      }
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
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchOrganizations();
    });
    return () => { active = false; };
  }, [fetchOrganizations]);

  // Sync initial selection from localStorage or first org
  useEffect(() => {
    if (orgs.length > 0 && !activeOrgId) {
      const savedOrgId = localStorage.getItem('aero_active_org_id');
      const exists = orgs.some(o => o.id === savedOrgId);
      const targetId = exists && savedOrgId ? savedOrgId : orgs[0].id;
      Promise.resolve().then(() => {
        setActiveOrgIdState(targetId);
      });
    }
  }, [orgs, activeOrgId]);

  // Fetch projects when active org changes
  useEffect(() => {
    if (activeOrgId) {
      localStorage.setItem('aero_active_org_id', activeOrgId);
      Promise.resolve().then(() => {
        fetchProjectsForOrg(activeOrgId);
      });
    }
  }, [activeOrgId, fetchProjectsForOrg]);

  const setActiveOrgId = useCallback((id: string) => {
    setActiveOrgIdState(id);
    localStorage.setItem('aero_active_org_id', id);
  }, []);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    if (id) localStorage.setItem('aero_active_project_id', id);
    else localStorage.removeItem('aero_active_project_id');
  }, []);

  const activeOrg = orgs.find(o => o.id === activeOrgId) || null;
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        orgs,
        projects,
        activeOrg,
        activeProject,
        activeOrgId,
        activeProjectId,
        loading,
        projectsLoading,
        error,
        setActiveOrgId,
        setActiveProjectId,
        refreshOrgs: fetchOrganizations,
        refreshProjects: async () => {
          if (activeOrgId) await fetchProjectsForOrg(activeOrgId);
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
