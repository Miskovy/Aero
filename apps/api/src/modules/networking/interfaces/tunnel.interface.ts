interface CloudflareSettings {
  apiTokenEncrypted?: string;
  tunnelTokenEnc?: string;
  iv?: string;
  authTag?: string;
  zoneId?: string;
  tunnelId?: string;
  customDomain?: string;
}

interface ProjectSettings {
  cloudflare?: CloudflareSettings;
}

interface CloudflareApiResponse {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
}