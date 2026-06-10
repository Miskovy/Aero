export interface WebhookPayload {
  ref?: string;
  after?: string;
  head_commit?: {
    id?: string;
    message?: string;
  };
}
