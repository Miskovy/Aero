export interface RestartPolicyConfig {
  condition?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  max_retries?: number;
}

export interface ResourceLimitsConfig {
  cpu?: string | number;
  memory?: string;
}

export interface HealthCheckConfig {
  test?: string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
}

export interface VaultItem {
  key: string;
  value?: string;
  encrypted_value?: string;
  iv: string;
  auth_tag: string;
}
