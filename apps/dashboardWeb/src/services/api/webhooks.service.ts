import { apiClient } from '@/lib/api-client';
import { Webhook } from '@/types';

export const webhooksService = {
  async list(serviceId: string): Promise<Webhook[]> {
    const res = await apiClient<Webhook[] | { data: Webhook[] }>(`/services/${serviceId}/webhooks`);
    return Array.isArray(res) ? res : res?.data || [];
  },

  async create(serviceId: string, data: { name: string; url: string; events: string[] }): Promise<Webhook> {
    return apiClient<Webhook>(`/services/${serviceId}/webhooks`, {
      method: 'POST',
      body: data,
    });
  },

  async delete(serviceId: string, webhookId: string): Promise<void> {
    await apiClient<void>(`/services/${serviceId}/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  },

  async regenerateSecret(serviceId: string, webhookId: string): Promise<{ secret: string }> {
    return apiClient<{ secret: string }>(`/services/${serviceId}/webhooks/${webhookId}/regenerate-secret`, {
      method: 'POST',
    });
  },
};
