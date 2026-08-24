import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/Authenticated.interface';
import { InitiateCheckoutDto } from './dto/Init-checkout.dto';

interface RawBodyRequest extends Request {
  rawBody?: string | Buffer;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get XPay gateway configuration' })
  getPaymentConfig() {
    return this.paymentsService.getPaymentConfig();
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create XPay checkout session for plan upgrade' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  createCheckoutSession(
    @Body() dto: InitiateCheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.paymentsService.createCheckoutSession({
      ...dto,
      userId: dto.userId || userId,
    });
  }

  @Get('history/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment transaction history for an organization',
  })
  getOrganizationHistory(@Param('organizationId') organizationId: string) {
    return this.paymentsService.getOrganizationHistory(organizationId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process incoming XPay webhooks' })
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-xpay-signature') xpaySignature?: string,
    @Headers('x-signature') signature?: string,
    @Body() body?: Record<string, unknown>,
  ) {
    const sig = xpaySignature || signature;
    const rawBody = req.rawBody ?? JSON.stringify(body ?? {});
    return this.paymentsService.handleWebhook(rawBody, sig, body);
  }

  @Get('subscription/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription details for an organization',
  })
  getSubscription(@Param('organizationId') organizationId: string) {
    return this.paymentsService.getSubscription(organizationId);
  }

  @Post('subscription/:organizationId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel organization subscription at period end' })
  cancelSubscription(@Param('organizationId') organizationId: string) {
    return this.paymentsService.cancelSubscription(organizationId);
  }

  @Post(':transactionId/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment transaction' })
  refundTransaction(@Param('transactionId') transactionId: string) {
    return this.paymentsService.refundTransaction(transactionId);
  }
}
