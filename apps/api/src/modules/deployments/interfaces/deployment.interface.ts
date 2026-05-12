export interface DeploymentJob {
  serviceId: string;
  deploymentId: string;
  gitUrl: string;
  branch: string;
  commitSha?: string;
}

export interface DeploymentResult {
  success: boolean;
  containerId?: string;
  imageTag?: string;
}
