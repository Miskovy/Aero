import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecretsService } from './secrets.service';
import { CreateSecretDto, UpdateSecretDto } from './dto/create-secret.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Secrets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services/:serviceId/secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new secret for a service' })
  @ApiResponse({ status: 201, description: 'Secret successfully created' })
  async create(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateSecretDto
  ) {
    return this.secretsService.createSecret(serviceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all secrets for a service' })
  @ApiResponse({ status: 200, description: 'List of secret keys (values are hidden)' })
  async list(@Param('serviceId') serviceId: string) {
    return this.secretsService.listSecrets(serviceId);
  }

  @Patch(':secretId')
  @ApiOperation({ summary: 'Update a secret value' })
  @ApiResponse({ status: 200, description: 'Secret successfully updated' })
  async update(
    @Param('serviceId') serviceId: string,
    @Param('secretId') secretId: string,
    @Body() dto: UpdateSecretDto
  ) {
    return this.secretsService.updateSecret(serviceId, secretId, dto);
  }

  @Delete(':secretId')
  @ApiOperation({ summary: 'Delete a secret' })
  @ApiResponse({ status: 200, description: 'Secret successfully deleted' })
  async delete(
    @Param('serviceId') serviceId: string,
    @Param('secretId') secretId: string
  ) {
    return this.secretsService.deleteSecret(serviceId, secretId);
  }
}
