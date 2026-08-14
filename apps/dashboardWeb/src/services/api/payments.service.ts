import { apiClient } from '@/lib/api-client';

export interface PaymentTransaction {
  id: string;
  organization_id: string;
  plan_id?: string;
  user_id?: string;
  xpay_session_id?: string;
  xpay_payment_intent?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | string;
  payment_method?: string;
  checkout_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  plan?: {
    id: string;
    name: string;
    price: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PaymentConfig {
  provider: string;
  configured: boolean;
  publishableKey: string;
  currency: string;
  supportedMethods: string[];
}

export interface InitiateCheckoutResponse {
  transactionId: string;
  sessionId: string;
  checkoutUrl: string;
  publishableKey: string;
}

export const paymentsService = {
  async getConfig(): Promise<PaymentConfig> {
    return apiClient<PaymentConfig>('/payments/config');
  },

  async createCheckoutSession(
    organizationId: string,
    planId: string,
    originUrl?: string,
  ): Promise<InitiateCheckoutResponse> {
    return apiClient<InitiateCheckoutResponse>('/payments/checkout-session', {
      method: 'POST',
      body: {
        organizationId,
        planId,
        originUrl: originUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
      },
    });
  },

  async getHistory(organizationId: string): Promise<PaymentTransaction[]> {
    return apiClient<PaymentTransaction[]>(`/payments/history/${organizationId}`);
  },

  async refund(transactionId: string): Promise<{ success: boolean; transaction: PaymentTransaction }> {
    return apiClient<{ success: boolean; transaction: PaymentTransaction }>(
      `/payments/${transactionId}/refund`,
      { method: 'POST' }
    );
  },
};
