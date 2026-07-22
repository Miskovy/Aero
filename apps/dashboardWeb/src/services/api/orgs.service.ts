import { apiClient } from '@/lib/api-client';
import { Organization } from '@/types';

export const orgsService = {
  async list(): Promise<Organization[]> {
    const res = await apiClient<Organization[] | { data: Organization[] }>('/organizations');
    return Array.isArray(res) ? res : res?.data || [];
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    return apiClient<Organization>('/organizations', {
      method: 'POST',
      body: data,
    });
  },

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    return apiClient<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  async delete(id: string): Promise<void> {
    await apiClient<void>(`/organizations/${id}`, {
      method: 'DELETE',
    });
  },
};
