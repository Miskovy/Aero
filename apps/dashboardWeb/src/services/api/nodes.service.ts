import { apiClient } from '@/lib/api-client';
import { CloudNode } from '@/types';

export const nodesService = {
  async list(orgId: string): Promise<CloudNode[]> {
    const res = await apiClient<CloudNode[] | { data: CloudNode[] }>(`/organizations/${orgId}/nodes`);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async get(orgId: string, nodeId: string): Promise<CloudNode> {
    return apiClient<CloudNode>(`/organizations/${orgId}/nodes/${nodeId}`);
  },

  async register(orgId: string, data: { name: string; ip_address: string }): Promise<CloudNode> {
    return apiClient<CloudNode>(`/organizations/${orgId}/nodes`, {
      method: 'POST',
      body: data,
    });
  },

  async delete(orgId: string, nodeId: string): Promise<void> {
    await apiClient<void>(`/organizations/${orgId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  },
};
