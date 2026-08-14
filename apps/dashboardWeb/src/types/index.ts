export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface Organization {
  id: string;
  name: string;
  tier?: string;
  plan?: string;
  plan_id?: string;
  membersCount?: number;
  projectsCount?: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  services_count?: number;
  created_at?: string;
  organization_id?: string;
}

export type ServiceType = 'application' | 'database' | 'cache' | 'queue' | 'static' | 'custom';
export type ServiceStatus = 'running' | 'stopped' | 'deploying' | 'building' | 'failed' | 'degraded';

export interface CloudService {
  id: string;
  name: string;
  slug: string;
  type: ServiceType;
  status: ServiceStatus;
  created_at: string;
  updated_at?: string;
  project?: Project;
  image?: string;
  ports?: string;
  replicas?: number;
  cpu_limit?: string;
  memory_limit?: string;
  environment_variables?: Record<string, string>;
}

export interface ServiceVolume {
  id: string;
  name: string;
  mountPath: string;
  sizeGb: number;
}

export interface ServiceBackup {
  id: string;
  name: string;
  status: string;
  sizeMb: number;
  created_at: string;
}

export type NodeStatus = 'online' | 'offline' | 'warning' | 'degraded';

export interface NodeResourceUsage {
  cpu: number; // percentage 0-100
  memory: number; // percentage 0-100
  disk?: number;
}

export interface CloudNode {
  id: string;
  name: string;
  ip_address: string;
  status: NodeStatus;
  os?: string;
  docker_version?: string;
  resource_usage: NodeResourceUsage;
  last_heartbeat?: string;
  created_at?: string;
}

export type AlertMetric = 'cpu_percent' | 'memory_percent' | 'disk_percent' | 'network_in' | 'network_out' | 'service_down';
export type AlertOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'pagerduty';

export interface AlertRule {
  id: string;
  name: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  duration_seconds: number;
  channel: AlertChannel;
  enabled: boolean;
  service_id?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_email?: string;
  ip_address?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  statusCode?: number;
  message?: string;
}
