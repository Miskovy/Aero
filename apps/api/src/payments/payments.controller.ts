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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InitiateCheckoutDto } from './dto/Init-checkout.dto';

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
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentsService.createCheckoutSession({
      ...dto,
      userId: dto.userId || userId,
    });
  }

  @Get('history/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transaction history for an organization' })
  getOrganizationHistory(@Param('organizationId') organizationId: string) {
    return this.paymentsService.getOrganizationHistory(organizationId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process incoming XPay webhooks' })
  async handleWebhook(
    @Req() req: any,
    @Headers('x-xpay-signature') xpaySignature?: string,
    @Headers('x-signature') signature?: string,
    @Body() body?: any,
  ) {
    const sig = xpaySignature || signature;
    const rawBody = req.rawBody || JSON.stringify(body || {});
    return this.paymentsService.handleWebhook(rawBody, sig, body);
  }

  @Post(':transactionId/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment transaction' })
  refundTransaction(@Param('transactionId') transactionId: string) {
    return this.paymentsService.refundTransaction(transactionId);
  }
}
