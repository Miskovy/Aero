export interface CreateCheckoutSessionDto {
  organizationId: string;
  planId?: string;
  planName: string;
  amount: number; // In main unit (EGP) or piasters
  currency?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  userId?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  paymentIntentId?: string;
}

export interface XPayCheckoutSessionResponse {
  id?: string;
  session_id?: string;
  url?: string;
  checkout_url?: string;
  payment_intent?: string;
  payment_intent_id?: string;
}

export interface XPayRefundResponse {
  id?: string;
  refund_id?: string;
}

export interface XPayDataObject {
  id?: string;
  session_id?: string;
  payment_intent?: string;
  payment_intent_id?: string;
  metadata?: Record<string, unknown>;
  amount?: number;
  currency?: string;
  payment_method_types?: string[];
}

export interface XPayWebhookPayload {
  type?: string;
  event?: string;
  data?: {
    object?: XPayDataObject;
    id?: string;
    session_id?: string;
    payment_intent?: string;
    payment_intent_id?: string;
    metadata?: Record<string, unknown>;
    amount?: number;
    currency?: string;
    payment_method_types?: string[];
  };
  id?: string;
  session_id?: string;
  payment_intent?: string;
  payment_intent_id?: string;
  metadata?: Record<string, unknown>;
  amount?: number;
  currency?: string;
  payment_method_types?: string[];
}

export interface ParsedWebhookEvent {
  eventType: string;
  sessionId?: string;
  paymentIntentId?: string;
  status: string;
  metadata?: Record<string, unknown>;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
}
