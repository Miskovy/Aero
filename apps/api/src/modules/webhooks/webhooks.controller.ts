import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { WebhookPayload } from './interfaces/webhook.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Webhooks')
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ─── Authenticated Endpoints (require JWT) ───

  @Post('services/:serviceId/webhooks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a webhook for a service' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created with secret token and URL.',
  })
  async createWebhook(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateWebhookDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.webhooksService.createWebhook(serviceId, userId, dto);
  }

  @Get('services/:serviceId/webhooks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List webhooks for a service' })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks with masked tokens.',
  })
  async listWebhooks(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.webhooksService.listWebhooks(serviceId, userId, pagination);
  }

  @Delete('services/:serviceId/webhooks/:webhookId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted.' })
  async deleteWebhook(
    @Param('serviceId') serviceId: string,
    @Param('webhookId') webhookId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.webhooksService.deleteWebhook(serviceId, webhookId, userId);
  }

  // ─── Public Endpoint (no auth required — validated by webhook token) ───

  @Post('webhooks/:id')
  @ApiOperation({
    summary: 'Receive webhook payload from GitHub/GitLab (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed and deployment triggered.',
  })
  async handleWebhook(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: WebhookPayload,
    @Headers() headers: Record<string, string>,
    @Query('token') queryToken?: string,
  ) {
    return this.webhooksService.handleWebhookPayload(
      id,
      payload,
      headers,
      queryToken,
    );
  }
}
