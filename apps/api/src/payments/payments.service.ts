import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XPayService } from './xpay.service';
import { InitiateCheckoutDto } from './dto/Init-checkout.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpayService: XPayService,
  ) {}

  /**
   * Return XPay public status & configuration.
   */
  getPaymentConfig() {
    return {
      provider: 'xpay',
      configured: this.xpayService.isConfigured(),
      publishableKey: this.xpayService.getPublishableKey(),
      currency: 'EGP',
      supportedMethods: ['card', 'valu', 'fawry', 'meeza'],
    };
  }

  /**
   * Initiate a subscription checkout session via XPay.
   */
  async createCheckoutSession(dto: InitiateCheckoutDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Selected plan not found');
    }

    // Default return URLs
    const defaultOrigin = dto.originUrl || 'http://localhost:3000';
    const successUrl = `${defaultOrigin}/billing?status=success&orgId=${org.id}`;
    const cancelUrl = `${defaultOrigin}/billing?status=cancelled&orgId=${org.id}`;

    // Get user email if userId is available
    let customerEmail = 'billing@aero.local';
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (user?.email) customerEmail = user.email;
    }

    // Call XPay service to generate session
    const sessionResult = await this.xpayService.createCheckoutSession({
      organizationId: org.id,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price || 499,
      currency: 'EGP',
      customerEmail,
      successUrl,
      cancelUrl,
      userId: dto.userId,
    });

    // Save pending payment transaction in Prisma
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        organization_id: org.id,
        plan_id: plan.id,
        user_id: dto.userId || null,
        xpay_session_id: sessionResult.sessionId,
        xpay_payment_intent: sessionResult.paymentIntentId || null,
        amount: plan.price || 499,
        currency: 'EGP',
        status: 'pending',
        checkout_url: sessionResult.checkoutUrl,
        payment_method: 'card',
        metadata: {
          planName: plan.name,
          organizationName: org.name,
        },
      },
    });

    return {
      transactionId: transaction.id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      publishableKey: this.xpayService.getPublishableKey(),
    };
  }

  /**
   * Get payment transactions history for an organization.
   */
  async getOrganizationHistory(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { organization_id: organizationId },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return transactions;
  }

  /**
   * Process XPay Webhook Event.
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signatureHeader?: string,
    payloadBody?: Record<string, unknown>,
  ) {
    // 1. Verify signature
    const isValid = this.xpayService.verifyWebhookSignature(
      rawBody,
      signatureHeader,
    );
    if (!isValid) {
      this.logger.warn('Invalid XPay webhook signature received');
      throw new BadRequestException('Invalid XPay webhook signature');
    }

    // 2. Parse payload
    const body: Record<string, unknown> =
      payloadBody ??
      (typeof rawBody === 'string'
        ? (JSON.parse(rawBody) as Record<string, unknown>)
        : (JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>));
    const parsed = this.xpayService.parseWebhookPayload(body);

    this.logger.log(
      `XPay webhook event ${parsed.eventType} for session ${parsed.sessionId || ''}`,
    );

    if (!parsed.sessionId) {
      return { received: true, message: 'No session id found in event' };
    }

    // 3. Find matching transaction
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { xpay_session_id: parsed.sessionId },
    });

    if (transaction) {
      // Update transaction status
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: parsed.status,
          xpay_payment_intent:
            parsed.paymentIntentId || transaction.xpay_payment_intent,
          payment_method: parsed.paymentMethod || transaction.payment_method,
          updated_at: new Date(),
        },
      });

      // If succeeded, upgrade organization plan!
      if (parsed.status === 'succeeded' && transaction.plan_id) {
        const plan = await this.prisma.plan.findUnique({
          where: { id: transaction.plan_id },
        });

        if (plan) {
          await this.prisma.organization.update({
            where: { id: transaction.organization_id },
            data: {
              plan_id: plan.id,
              plan: plan.name.toLowerCase(),
              updated_at: new Date(),
            },
          });
          this.logger.log(
            `Successfully upgraded org ${transaction.organization_id} to plan ${plan.name}`,
          );
        }
      }
    } else {
      this.logger.warn(
        `No transaction found for session ${parsed.sessionId || ''}`,
      );
    }

    return { received: true, status: parsed.status };
  }

  /**
   * Process refund for a transaction.
   */
  async refundTransaction(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === 'refunded') {
      throw new BadRequestException('Transaction has already been refunded');
    }

    if (!transaction.xpay_session_id) {
      throw new BadRequestException('Transaction is missing XPay session ID');
    }

    const refundRes = await this.xpayService.refundPayment(
      transaction.xpay_session_id,
      transaction.amount,
    );

    if (refundRes.success) {
      const existingMetadata =
        typeof transaction.metadata === 'object' &&
        transaction.metadata !== null
          ? (transaction.metadata as Record<string, unknown>)
          : {};

      const updated = await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'refunded',
          updated_at: new Date(),
          metadata: {
            ...existingMetadata,
            refundId: refundRes.refundId,
            refundedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        transaction: updated,
      };
    }

    throw new BadRequestException('Failed to process refund with XPay');
  }
}
