import { apiClient } from '@/lib/api-client';

export interface Plan {
  id: string;
  name: string;
  price: number;
  max_projects?: number;
  is_inf_proj?: boolean;
  max_nodes?: number;
  is_inf_nodes?: boolean;
  max_services?: number;
  is_inf_services?: boolean;
  max_deployments?: number;
  is_inf_deployments?: boolean;
  max_backups?: number;
  is_inf_backups?: boolean;
  custom_domains?: boolean;
  max_teams?: number;
  is_inf_teams?: boolean;
  is_active?: boolean;
}

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan-free',
    name: 'Developer Tier',
    price: 0,
    max_projects: 2,
    max_nodes: 1,
    max_services: 3,
    max_deployments: 50,
    custom_domains: false,
  },
  {
    id: 'plan-standard',
    name: 'Standard Tier',
    price: 499,
    max_projects: 10,
    max_nodes: 5,
    max_services: 25,
    max_deployments: 500,
    custom_domains: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Tier',
    price: 1999,
    max_projects: 50,
    is_inf_proj: true,
    is_inf_nodes: true,
    is_inf_services: true,
    is_inf_deployments: true,
    custom_domains: true,
  },
  {
    id: 'plan-max',
    name: 'Max Tier',
    price: 4999,
    is_inf_proj: true,
    is_inf_nodes: true,
    is_inf_services: true,
    is_inf_deployments: true,
    custom_domains: true,
  },
];

export const plansService = {
  async getAll(): Promise<Plan[]> {
    try {
      const res = await apiClient<Plan[] | { data: Plan[] }>('/plans');
      const list = Array.isArray(res) ? res : res?.data || [];
      if (list.length > 0) {
        return list.sort((a, b) => (a.price || 0) - (b.price || 0));
      }
      return DEFAULT_PLANS;
    } catch {
      return DEFAULT_PLANS;
    }
  },
};
