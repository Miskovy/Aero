import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('marketplace/templates')
  @ApiOperation({ summary: 'List all available templates from the registry' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all official and premium templates',
  })
  async listTemplates() {
    return this.marketplaceService.listTemplates();
  }

  @Get('marketplace/templates/:templateId')
  @ApiOperation({ summary: 'Get details for a specific template' })
  async getTemplate(@Param('templateId') templateId: string) {
    return this.marketplaceService.getTemplate(templateId);
  }

  @Post('projects/:projectId/marketplace/deploy/:templateId')
  @ApiOperation({ summary: 'Deploy a marketplace template to a project' })
  @ApiResponse({
    status: 201,
    description: 'Template deployed and service created successfully',
  })
  async deployTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() body: { envVars: Record<string, string> },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.marketplaceService.deployTemplate(
      projectId,
      templateId,
      body.envVars || {},
      userId,
    );
  }
}
