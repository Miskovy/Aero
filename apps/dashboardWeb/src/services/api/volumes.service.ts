import { apiClient } from '@/lib/api-client';

export interface ServiceVolume {
  id: string;
  service_id: string;
  name: string;
  mount_path: string;
  host_path?: string;
  driver?: string;
  size_bytes?: number;
  created_at: string;
}

export const volumesService = {
  list: async (serviceId: string): Promise<ServiceVolume[]> => {
    return apiClient<ServiceVolume[]>(`/services/${serviceId}/volumes`);
  },

  create: async (
    serviceId: string,
    data: { name: string; mount_path: string; host_path?: string }
  ): Promise<ServiceVolume> => {
    return apiClient<ServiceVolume>(`/services/${serviceId}/volumes`, {
      method: 'POST',
      body: data,
    });
  },

  delete: async (serviceId: string, volumeId: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/services/${serviceId}/volumes/${volumeId}`, {
      method: 'DELETE',
    });
  },
};
