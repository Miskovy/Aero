import { apiClient } from '@/lib/api-client';
import { Project } from '@/types';

export const projectsService = {
  async list(orgId?: string): Promise<Project[]> {
    const res = await apiClient<Project[] | { data: Project[] }>('/projects', {
      params: orgId ? { orgId } : undefined,
    });
    return Array.isArray(res) ? res : res?.data || [];
  },

  async create(data: Partial<Project>): Promise<Project> {
    return apiClient<Project>('/projects', {
      method: 'POST',
      body: data,
    });
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return apiClient<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(id: string): Promise<void> {
    await apiClient<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
};
