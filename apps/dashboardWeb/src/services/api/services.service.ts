import { apiClient } from '@/lib/api-client';
import { CloudService, ServiceVolume, ServiceBackup } from '@/types';

export const servicesService = {
  async list(projectId?: string): Promise<CloudService[]> {
    const res = await apiClient<CloudService[] | { data: CloudService[] }>('/services', {
      params: projectId ? { projectId } : undefined,
    });
    return Array.isArray(res) ? res : res?.data || [];
  },

  async get(id: string): Promise<CloudService> {
    return apiClient<CloudService>(`/services/${id}`);
  },

  async create(data: Partial<CloudService>): Promise<CloudService> {
    return apiClient<CloudService>('/services', {
      method: 'POST',
      body: data,
    });
  },

  async update(id: string, data: Partial<CloudService>): Promise<CloudService> {
    return apiClient<CloudService>(`/services/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(id: string): Promise<void> {
    await apiClient<void>(`/services/${id}`, {
      method: 'DELETE',
    });
  },

  async start(id: string): Promise<CloudService> {
    return apiClient<CloudService>(`/services/${id}/start`, { method: 'POST' });
  },

  async stop(id: string): Promise<CloudService> {
    return apiClient<CloudService>(`/services/${id}/stop`, { method: 'POST' });
  },

  async restart(id: string): Promise<CloudService> {
    return apiClient<CloudService>(`/services/${id}/restart`, { method: 'POST' });
  },

  async getVolumes(id: string): Promise<ServiceVolume[]> {
    const res = await apiClient<ServiceVolume[] | { data: ServiceVolume[] }>(`/services/${id}/volumes`);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async createVolume(id: string, data: { name: string; mountPath: string }): Promise<ServiceVolume> {
    return apiClient<ServiceVolume>(`/services/${id}/volumes`, {
      method: 'POST',
      body: data,
    });
  },

  async deleteVolume(id: string, volumeId: string): Promise<void> {
    await apiClient<void>(`/services/${id}/volumes/${volumeId}`, {
      method: 'DELETE',
    });
  },

  async getBackups(id: string): Promise<ServiceBackup[]> {
    const res = await apiClient<ServiceBackup[] | { data: ServiceBackup[] }>(`/services/${id}/backups`);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async createBackup(id: string): Promise<ServiceBackup> {
    return apiClient<ServiceBackup>(`/services/${id}/backups`, {
      method: 'POST',
    });
  },
};
