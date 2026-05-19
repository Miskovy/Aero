export interface DockerProgressEvent {
  status?: string;
  id?: string;
  progress?: string;
  stream?: string;
  error?: string;
  errorDetail?: { message?: string };
}
