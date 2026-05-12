export interface CloudflareSettings {
  apiTokenEncrypted?: string;
  tunnelTokenEnc?: string;
  iv?: string;
  authTag?: string;
  zoneId?: string;
  tunnelId?: string;
  customDomain?: string;
}

export interface ProjectSettings {
  cloudflare?: CloudflareSettings;
}

export interface CloudflareApiResponse {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
}
