import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@Controller('users/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, description: 'API key created. The raw key is returned ONLY in this response.' })
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.apiKeysService.createApiKey(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys (keys are masked)' })
  @ApiResponse({ status: 200, description: 'List of API keys with masked values.' })
  async listApiKeys(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.apiKeysService.listApiKeys(userId);
  }

  @Delete(':keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked.' })
  async deleteApiKey(
    @Param('keyId') keyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');
    return this.apiKeysService.deleteApiKey(userId, keyId);
  }
}
