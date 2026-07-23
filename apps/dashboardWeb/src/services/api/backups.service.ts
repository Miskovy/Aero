import { apiClient } from '@/lib/api-client';
import { PaginatedResponse } from '@/types';

export interface ServiceBackup {
  id: string;
  service_id: string;
  filename: string;
  storage_path: string;
  size_bytes?: number;
  status: string;
  trigger: string;
  triggered_by?: string;
  created_at: string;
}

export const backupsService = {
  list: async (serviceId: string): Promise<PaginatedResponse<ServiceBackup>> => {
    return apiClient<PaginatedResponse<ServiceBackup>>(`/services/${serviceId}/backups`);
  },

  create: async (serviceId: string): Promise<ServiceBackup> => {
    return apiClient<ServiceBackup>(`/services/${serviceId}/backups`, {
      method: 'POST',
    });
  },

  restore: async (serviceId: string, backupId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/services/${serviceId}/backups/${backupId}/restore`, {
      method: 'POST',
    });
  },

  delete: async (serviceId: string, backupId: string): Promise<{ success: boolean }> => {
    return apiClient<{ success: boolean }>(`/services/${serviceId}/backups/${backupId}`, {
      method: 'DELETE',
    });
  },
};
