import { ServiceStatus, DeploymentStatus } from '../constants/statuses';

export type ServiceType = 'application' | 'database' | 'cache' | 'queue' | 'static' | 'custom';
export type SourceType = 'git' | 'docker_image' | 'docker_compose' | 'dockerfile' | 'marketplace';
export type DeploymentTrigger = 'manual' | 'git_push' | 'webhook' | 'rollback' | 'scheduled' | 'api';
export type DomainType = 'auto_generated' | 'custom' | 'wildcard';

export interface ServiceResourceLimits {
  cpu: string;
  memory: string;
  [key: string]: any;
}

export interface ServiceHealthCheck {
  path?: string;
  port?: number;
  interval?: number;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface ServiceRestartPolicy {
  condition: string;
  max_retries?: number;
}

export interface Service {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  type: ServiceType;
  sourceType: SourceType;
  dockerImage?: string | null;
  dockerComposePath?: string | null;
  dockerfilePath?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  gitSourceId?: string | null;
  gitBranch?: string | null;
  gitSubdirectory?: string | null;
  activeDeploymentId?: string | null;
  status: ServiceStatus;
  resourceLimits: ServiceResourceLimits;
  healthCheck: ServiceHealthCheck;
  restartPolicy: ServiceRestartPolicy;
  replicas: number;
  nodeId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Deployment {
  id: string;
  serviceId: string;
  version?: string | null;
  gitCommitSha?: string | null;
  gitCommitMessage?: string | null;
  dockerImageTag?: string | null;
  status: DeploymentStatus;
  trigger: DeploymentTrigger;
  triggeredBy?: string | null;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
  buildDurationMs?: number | null;
  buildLogsSummary?: any | null;
  createdAt: Date | string;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: Array<{ ip: string; privatePort: number; publicPort: number; type: string }>;
  created: number;
}

export interface ServiceDomain {
  id: string;
  serviceId: string;
  domain: string;
  type: DomainType;
  sslEnabled: boolean;
  sslCertificatePath?: string | null;
  verificationStatus: string;
  verificationToken?: string | null;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface ServiceVolume {
  id: string;
  serviceId: string;
  name: string;
  mountPath: string;
  hostPath?: string | null;
  driver: string;
  sizeBytes: number | bigint;
  createdAt: Date | string;
}
