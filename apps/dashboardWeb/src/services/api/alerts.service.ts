import { apiClient } from '@/lib/api-client';
import { AlertRule } from '@/types';

export const alertsService = {
  async list(orgId: string): Promise<AlertRule[]> {
    const res = await apiClient<AlertRule[] | { data: AlertRule[] }>(`/organizations/${orgId}/alerts`);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async create(orgId: string, data: Partial<AlertRule>): Promise<AlertRule> {
    return apiClient<AlertRule>(`/organizations/${orgId}/alerts`, {
      method: 'POST',
      body: data,
    });
  },

  async delete(orgId: string, ruleId: string): Promise<void> {
    await apiClient<void>(`/organizations/${orgId}/alerts/${ruleId}`, {
      method: 'DELETE',
    });
  },
};
