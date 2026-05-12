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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/node.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';

@ApiTags('Nodes / Servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected servers for an organization' })
  async listNodes(
    @Param('orgId') orgId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.listNodes(orgId, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new server and generate a pairing token',
  })
  async createNode(
    @Param('orgId') orgId: string,
    @Body() dto: CreateNodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.createNode(orgId, dto, userId);
  }

  @Delete(':nodeId')
  @ApiOperation({ summary: 'Revoke access for a server' })
  async removeNode(
    @Param('orgId') orgId: string,
    @Param('nodeId') nodeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.removeNode(orgId, nodeId, userId);
  }
}
