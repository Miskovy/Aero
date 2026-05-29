export interface CloudflareError {
  code: number;
  message: string;
}

export interface CloudflareResponse {
  success: boolean;
  errors?: CloudflareError[];
}

export interface CloudflareDnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
}

export interface CloudflareDnsSearchResponse extends CloudflareResponse {
  result?: CloudflareDnsRecord[];
}

export interface DockerNetwork {
  IPAddress?: string;
  [key: string]: unknown;
}

export interface DockerNetworkSettings {
  IPAddress?: string;
  Networks?: Record<string, DockerNetwork>;
  [key: string]: unknown;
}
