export const SERVICE_STATUSES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  DEPLOYING: 'deploying',
  BUILDING: 'building',
  FAILED: 'failed',
  DEGRADED: 'degraded',
} as const;

export type ServiceStatus = typeof SERVICE_STATUSES[keyof typeof SERVICE_STATUSES];

export const DEPLOYMENT_STATUSES = {
  QUEUED: 'queued',
  BUILDING: 'building',
  DEPLOYING: 'deploying',
  RUNNING: 'running',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
  CANCELLED: 'cancelled',
} as const;

export type DeploymentStatus = typeof DEPLOYMENT_STATUSES[keyof typeof DEPLOYMENT_STATUSES];

export const DOMAIN_VERIFICATION_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
} as const;

export type DomainVerificationStatus = typeof DOMAIN_VERIFICATION_STATUSES[keyof typeof DOMAIN_VERIFICATION_STATUSES];

export const BACKUP_STATUSES = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type BackupStatus = typeof BACKUP_STATUSES[keyof typeof BACKUP_STATUSES];

export const NODE_STATUSES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  DRAINING: 'draining',
  MAINTENANCE: 'maintenance',
} as const;

export type NodeStatus = typeof NODE_STATUSES[keyof typeof NODE_STATUSES];
