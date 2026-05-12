export interface Repository {
  id: number;
  name: string;
  fullName: string;
  cloneUrl: string;
}

export interface WebhookData {
  branch: string;
  commitSha: string;
  repository: string;
  provider: string;
}

export interface GitHubPayload {
  ref?: string;
  after?: string;
  head_commit?: { id: string };
  repository?: { full_name: string };
}

export interface GitLabPayload {
  ref?: string;
  checkout_sha?: string;
  commits?: Array<{ id: string }>;
  project?: { path_with_namespace: string };
}
