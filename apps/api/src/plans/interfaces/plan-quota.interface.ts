export interface QuotaItem {
  resource: string;
  used: number;
  max: number | null;
  isInfinite: boolean;
  percentage: number | null;
  limitReached: boolean;
}

export interface OrganizationQuotaSummary {
  organizationId: string;
  plan: {
    id: string;
    name: string;
    price: number;
    customDomains: boolean;
  };
  subscription?: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  hasReachedAnyQuota: boolean;
  quotas: {
    projects: QuotaItem;
    services: QuotaItem;
    nodes: QuotaItem;
    deployments: QuotaItem;
    backups: QuotaItem;
    webhooks: QuotaItem;
    apiKeys: QuotaItem;
    alerts: QuotaItem;
    teams: QuotaItem;
    members: QuotaItem;
  };
  features: {
    customDomains: boolean;
  };
}
