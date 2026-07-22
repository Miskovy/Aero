import { apiClient } from '@/lib/api-client';
import { AuditLog } from '@/types';

export interface AuditLogFilter {
  action?: string;
  resource_type?: string;
  user_id?: string;
}

export const auditService = {
  async list(orgId: string, filter?: AuditLogFilter): Promise<AuditLog[]> {
    const res = await apiClient<AuditLog[] | { data: AuditLog[] }>(
      `/organizations/${orgId}/audit-logs`,
      { params: filter as Record<string, string | number | boolean | undefined> }
    );
    return Array.isArray(res) ? res : res?.data || [];
  },
};
